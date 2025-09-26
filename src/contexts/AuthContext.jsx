// src/contexts/AuthContext.jsx - UPDATED VERSION
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Helper function to get role ID
  const getRoleId = async (roleName) => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', roleName)
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error getting role ID:', error);
      throw error;
    }
  };

  // Helper function to get gender ID
  const getGenderId = async (genderCode) => {
    try {
      if (!genderCode) return null;
      
      const { data, error } = await supabase
        .from('genders')
        .select('id')
        .eq('gender_code', genderCode)
        .single();
      
      if (error) return null;
      return data?.id || null;
    } catch (error) {
      console.error('Error getting gender ID:', error);
      return null;
    }
  };

  // UPDATED: Patient registration function with better error handling
  const signUp = async (userData) => {
    try {
      console.log('Starting signUp function with:', userData);

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          full_name: `${userData.firstName} ${userData.lastName}`,
          phone_number: userData.phone,
          user_type: 'patient'
        }
      }
    });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from authentication');
      }

      console.log('Auth user created:', authData.user.id);

      // IMPORTANT: Wait a moment to ensure auth session is established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Get patient role ID
      const roleId = await getRoleId('patient');
      console.log('Role ID:', roleId);

      // Step 3: Get gender ID
      const genderId = await getGenderId(userData.gender);
      console.log('Gender ID:', genderId);

      // Step 4: Insert into users table with error details
      const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role_id: roleId,
        phone_number: userData.phone,
        date_of_birth: userData.dateOfBirth,
        gender_id: genderId,
        address: userData.address
      });

      if (userError) {
        console.error('User insert error details:', userError);
        
        
        // Provide more specific error message
        if (userError.code === '42501') {
          throw new Error('Permission denied: RLS policy blocking insert. Please check database policies.');
        }
        throw new Error(`Database error: ${userError.message}`);
      }

      console.log('User record created');

      // Step 5: Insert into patients table
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: authData.user.id
        });

      if (patientError) {
        console.error('Patient insert error:', patientError);
        throw new Error(`Patient record creation failed: ${patientError.message}`);
      }

      console.log('Patient record created');
      return { 
        success: true, 
        data: authData,
        message: 'Registration successful! Please check your email for verification.'
      };

    } catch (error) {
      console.error('SignUp error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  };

  // Login function
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};