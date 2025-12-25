'use client'

import { useEffect, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { getUserInitials } from '@/lib/utils-user'

export function UserProfile({ 
  userId, 
  className = '',
  showEmail = true,
  size = 'default' 
}) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
  }, [userId])

  const fetchUserData = async () => {
    try {
      const url = userId ? `/api/users?userId=${userId}` : '/api/users'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Avatar className={size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'}>
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Loading...</span>
          {showEmail && <span className="text-xs text-muted-foreground">...</span>}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const initials = getUserInitials(user.name)
  const displayName = user.name || user.email?.split('@')[0] || 'User'
  const displayEmail = user.email || 'No email'

  const avatarSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className={avatarSize}>
        <AvatarImage src={user.picture} alt={displayName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className={`${textSize} font-medium truncate`}>{displayName}</span>
        {showEmail && (
          <span className={`text-xs text-muted-foreground truncate`}>{displayEmail}</span>
        )}
      </div>
    </div>
  )
}

