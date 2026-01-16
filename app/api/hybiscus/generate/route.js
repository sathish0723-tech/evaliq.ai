import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const HYBISCUS_API_KEY = process.env.HYBISCUS_API_KEY || 'MIQjPTQ2OTlDVFxX1KKbNJ6vyMfFkBrnuSV_EEIV_kw'
const HYBISCUS_BASE_URL = 'https://api.hybiscus.dev'

/**
 * Convert simple sections format to Hybiscus components
 */
function convertSectionsToComponents(sections) {
  const components = []
  
  sections.forEach((section) => {
    if (section.type === 'text') {
      components.push({
        type: 'Text',
        options: {
          text: section.content || '',
          size: 'sm',
          align: 'left',
          markdown_format: true
        }
      })
    } else if (section.type === 'chart' && section.chartType === 'bar') {
      // Convert to Chart.Bar format
      const chartData = section.data?.labels?.map((label, index) => ({
        x: label,
        y: section.data?.values?.[index] || 0
      })) || []
      
      if (chartData.length > 0) {
        components.push({
          type: 'Chart.Bar',
          options: {
            data: chartData,
            x_label: section.data?.x_label || '',
            y_label: section.data?.y_label || '',
            chart_title: section.title || null,
            caption: section.caption || null,
            width: 'full'
          }
        })
      }
    }
  })
  
  return components
}

/**
 * Build Hybiscus report definition
 */
function buildReportDefinition(title, sections) {
  const components = convertSectionsToComponents(sections)
  
  return {
    $schema: 'https://hybiscuscdn.blob.core.windows.net/public/Report.schema.json',
    options: {
      report_title: title || 'Report',
      report_byline: '',
      enable_header: true,
      version_number: 'v1.0.0',
      vertical_margin: 5,
      horizontal_margin: 5
    },
    config: {
      n_pages: 1, // Keep at 1 due to plan limitations - content will auto-flow
      enable_multi_page: false, // Disabled due to plan limit (1 page per report)
      enable_pagination: false, // Disabled since single page
      landscape: true, // Use landscape to fit more content on single page
      color_theme: 'default',
      typography_theme: 'default'
    },
    components: components
  }
}

/**
 * Poll task status until completion
 */
async function pollTaskStatus(taskId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${HYBISCUS_BASE_URL}/api/v1/get-task-status?task_id=${taskId}`,
      {
        headers: {
          'X-API-KEY': HYBISCUS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`)
    }

    const statusData = await response.json()
    
    if (statusData.status === 'SUCCESS') {
      return true
    } else if (statusData.status === 'FAILED') {
      throw new Error(statusData.error_message || 'Task failed')
    }
    
    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error('Task timeout - report generation took too long')
}

/**
 * POST /api/hybiscus/generate
 * Generate PDF using Hybiscus API (async task-based)
 */
export async function POST(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reportJSON, title } = body

    if (!reportJSON) {
      return NextResponse.json(
        { error: 'reportJSON is required' },
        { status: 400 }
      )
    }

    // Build Hybiscus report definition
    const reportTitle = title || reportJSON.title || 'Report'
    const sections = reportJSON.sections || []
    
    console.log('Calling Hybiscus API to build report...', {
      title: reportTitle,
      sectionsCount: sections.length,
      estimatedPages: Math.ceil(sections.length / 10) // Rough estimate: ~10 sections per page
    })
    
    const reportDefinition = buildReportDefinition(reportTitle, sections)
    
    console.log('Report definition created:', {
      componentsCount: reportDefinition.components.length,
      enableMultiPage: reportDefinition.config.enable_multi_page
    })
    
    // Step 1: Submit the report build task
    const buildResponse = await fetch(`${HYBISCUS_BASE_URL}/api/v1/build-report`, {
      method: 'POST',
      headers: {
        'X-API-KEY': HYBISCUS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportDefinition),
    })

    if (!buildResponse.ok) {
      const errorText = await buildResponse.text()
      let errorData = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { detail: errorText || 'Unknown error' }
      }
      
      console.error('Hybiscus API error:', {
        status: buildResponse.status,
        statusText: buildResponse.statusText,
        error: errorData,
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to generate PDF',
          details: errorData.detail || errorData.error || errorData.message || `HTTP ${buildResponse.status}: ${buildResponse.statusText}`
        },
        { status: buildResponse.status || 500 }
      )
    }

    const buildData = await buildResponse.json()
    const taskId = buildData.task_id

    if (!taskId) {
      return NextResponse.json(
        { error: 'No task ID returned from API' },
        { status: 500 }
      )
    }

    console.log(`Task created: ${taskId}, polling for status...`)

    // Step 2: Poll task status until completion
    await pollTaskStatus(taskId)

    // Step 3: Get the generated PDF
    const getReportResponse = await fetch(
      `${HYBISCUS_BASE_URL}/api/v1/get-report?task_id=${taskId}`,
      {
        headers: {
          'X-API-KEY': HYBISCUS_API_KEY,
        },
      }
    )

    if (!getReportResponse.ok) {
      throw new Error(`Failed to get report: ${getReportResponse.statusText}`)
    }

    // Get PDF as blob
    const pdfBlob = await getReportResponse.blob()
    
    // Convert blob to base64 for response
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      pdf: base64,
      contentType: 'application/pdf',
      filename: `${reportTitle}_${new Date().toISOString().split('T')[0]}.pdf`
    })
  } catch (error) {
    console.error('Error generating PDF with Hybiscus:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    )
  }
}

