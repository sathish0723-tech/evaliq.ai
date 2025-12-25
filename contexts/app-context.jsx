"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { buildUrlWithBatch } from '@/lib/utils-batch'

const AppContext = createContext(undefined)

export function AppProvider({ children }) {
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [management, setManagement] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Fetch management data
  const fetchManagement = async () => {
    try {
      const response = await fetch('/api/management', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setManagement(data.management)
      }
    } catch (error) {
      console.error('Error fetching management:', error)
    }
  }

  // Fetch user data
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const url = buildUrlWithBatch('/api/classes')
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  // Fetch students
  const fetchStudents = async (classId = null) => {
    try {
      const url = buildUrlWithBatch('/api/students', classId ? { classId } : {})
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  // Initialize data on mount - only fetch once
  useEffect(() => {
    if (initialized) return // Prevent multiple initializations
    
    const initialize = async () => {
      setLoading(true)
      setInitialized(true)
      
      // Fetch essential data (management and user) first
      await Promise.all([
        fetchManagement(),
        fetchUser(),
      ])
      
      setLoading(false)
      
      // Fetch classes and students in background (non-blocking)
      fetchClasses()
      fetchStudents()
    }
    
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const value = {
    classes,
    students,
    management,
    user,
    loading,
    fetchClasses,
    fetchStudents,
    fetchManagement,
    fetchUser,
    setClasses,
    setStudents,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

