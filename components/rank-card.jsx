"use client"

import { useRef } from "react"
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Award, User, Calendar, TrendingUp } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export function RankCard({ student, classData, subject, calculatedMarks, dateRange }) {
  const cardRef = useRef()

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('portrait', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${student.name}_RankCard_${dateRange.start}_${dateRange.end}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const finalPercentage = calculatedMarks?.finalPercentage || 0
  const attendancePercentage = calculatedMarks?.attendancePercentage || 0
  const marksPercentage = calculatedMarks?.marksPercentage || 0
  const testCount = calculatedMarks?.testCount || 0

  // Determine grade based on final percentage
  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' }
    if (percentage >= 80) return { grade: 'A', color: 'text-green-500' }
    if (percentage >= 70) return { grade: 'B+', color: 'text-blue-500' }
    if (percentage >= 60) return { grade: 'B', color: 'text-blue-400' }
    if (percentage >= 50) return { grade: 'C+', color: 'text-yellow-500' }
    if (percentage >= 40) return { grade: 'C', color: 'text-yellow-400' }
    return { grade: 'D', color: 'text-red-500' }
  }

  const gradeInfo = getGrade(finalPercentage)

  return (
    <div className="relative">
      <Card ref={cardRef} className="w-full border-2 print:border-0 print:shadow-none">
        <CardContent className="p-6 print:p-8">
          {/* Header */}
          <div className="text-center mb-6 print:mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Rank Card</h2>
            </div>
            {classData && (
              <p className="text-sm text-muted-foreground">{classData.name}</p>
            )}
            {subject && (
              <p className="text-sm text-muted-foreground">Subject: {subject.name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
            </p>
          </div>

          {/* Student Info */}
          <div className="border-b pb-4 mb-4 print:pb-6 print:mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.email}</p>
                {student.batch && (
                  <p className="text-xs text-muted-foreground">Batch: {student.batch}</p>
                )}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-4 print:space-y-6">
            {/* Final Grade */}
            <div className="text-center py-4 print:py-6 bg-accent rounded-lg print:bg-transparent print:border-2">
              <div className="text-sm text-muted-foreground mb-1">Overall Performance</div>
              <div className={`text-4xl font-bold ${gradeInfo.color} print:text-black`}>
                {finalPercentage.toFixed(2)}%
              </div>
              <div className={`text-xl font-semibold mt-2 ${gradeInfo.color} print:text-black`}>
                Grade: {gradeInfo.grade}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4 print:gap-6">
              <div className="border rounded-lg p-4 print:border-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Marks</span>
                </div>
                <div className="text-2xl font-bold">{marksPercentage.toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {testCount} test{testCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="border rounded-lg p-4 print:border-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Attendance</span>
                </div>
                <div className="text-2xl font-bold">{attendancePercentage.toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {dateRange.start} to {dateRange.end}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="border-t pt-4 print:pt-6 print:border-2">
              <h4 className="text-sm font-semibold mb-3">Performance Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Test Marks:</span>
                  <span className="font-medium">{marksPercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attendance:</span>
                  <span className="font-medium">{attendancePercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between border-t pt-2 print:border-t-2 print:pt-2">
                  <span className="font-semibold">Final Score:</span>
                  <span className="font-bold text-lg">{finalPercentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 print:mt-8 pt-4 print:pt-6 border-t print:border-t-2 text-center text-xs text-muted-foreground">
            <p>Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Download Button */}
      <div className="mt-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleDownloadPDF}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  )
}

