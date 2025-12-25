'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepChat({ chatId, onStepComplete }) {
  const [activeStep, setActiveStep] = React.useState(0)
  const [stepStatus, setStepStatus] = React.useState({})
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false)
  const [completedSteps, setCompletedSteps] = React.useState([])

  // Steps for report generation
  const steps = [
    {
      label: 'Analyzing data',
      description: 'Processing and analyzing the collected data...',
      statusKey: 'analyze',
    },
    {
      label: 'Generating report',
      description: 'Creating the final report...',
      statusKey: 'generate',
    },
  ]

  // Check backend status for current step
  const checkStepStatus = async (stepIndex) => {
    if (stepIndex >= steps.length) return

    setIsCheckingStatus(true)
    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          action: 'status',
          step: stepIndex,
          statusKey: steps[stepIndex].statusKey,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setStepStatus((prev) => ({
          ...prev,
          [stepIndex]: data.status || 'processing',
        }))

        // If step is complete, mark as completed and move to next
        if (data.status === 'completed' || data.completed) {
          // Mark current step as completed
          setCompletedSteps((prev) => {
            if (!prev.includes(stepIndex)) {
              return [...prev, stepIndex]
            }
            return prev
          })
          
          // Wait a moment before showing next step
          setTimeout(() => {
            if (stepIndex < steps.length - 1) {
              setActiveStep(stepIndex + 1)
            } else {
              // All steps completed
              if (onStepComplete) {
                onStepComplete(data)
              }
            }
          }, 500) // Small delay for smooth transition
        }
      }
    } catch (error) {
      console.error('Error checking step status:', error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Auto-advance steps and check status
  React.useEffect(() => {
    if (activeStep < steps.length && chatId) {
      // Check status for current step
      const interval = setInterval(() => {
        checkStepStatus(activeStep)
      }, 2000) // Check every 2 seconds

      // Initial check
      checkStepStatus(activeStep)

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, chatId])

  const currentStep = steps[activeStep]
  const status = stepStatus[activeStep]
  const isCompleted = completedSteps.includes(activeStep)

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Show completed steps in minimal view */}
          {completedSteps.length > 0 && (
            <div className="space-y-2 pb-4 border-b">
              {completedSteps.map((completedIndex) => {
                const step = steps[completedIndex]
                return (
                  <div key={step.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground line-through">
                      {step.label}
                    </span>
                    <span className="text-xs text-primary ml-auto">Completed</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Show current active step */}
          {activeStep < steps.length && currentStep && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4">
                {/* Step icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Spinner className="h-5 w-5 text-primary" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {currentStep.label}
                    </h3>
                    {isCompleted && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {currentStep.description}
                  </p>

                  {status && !isCompleted && (
                    <p className="text-xs text-muted-foreground">
                      Status: {status}
                    </p>
                  )}

                  {!isCompleted && (
                    <div className="flex items-center gap-2 pt-2">
                      <Spinner className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Processing...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* All steps completed message */}
          {activeStep === steps.length && (
            <div className="mt-6 rounded-lg border bg-primary/5 border-primary/20 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  All steps completed - Report is ready!
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
