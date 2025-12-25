"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Calendar, User } from 'lucide-react'

export function TestCard({ test, isSelected, onClick }) {
  return (
    <div className="w-full min-w-[140px]">
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected
            ? 'ring-2 ring-primary border-primary'
            : ''
        }`}
        onClick={onClick}
      >
        <CardContent className="px-4 py-4">
          <div className="text-base font-semibold mb-2 leading-tight break-words">
            {test.name}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{new Date(test.date).toLocaleDateString()}</span>
            </div>
            {test.coachName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{test.coachName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

