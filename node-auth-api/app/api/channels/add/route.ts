import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has required role
    if (!['manager', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await req.json();
    const { name, description, newsletter_pic } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Make request to WhatsApp API
    const apiUrl = 'https://gate.whapi.cloud/newsletters';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.WHAPI_KEY}`,
    };

    const requestData = {
      name,
      description,
      newsletter_pic: newsletter_pic || ''
    };

    console.log('Making request to WhatsApp API:', {
      url: apiUrl,
      data: { ...requestData, newsletter_pic: newsletter_pic ? '[BASE64_IMAGE]' : '' }
    });

    const response = await axios.post(apiUrl, requestData, { 
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('WhatsApp API Response:', response.data);

    if (!response.data) {
      throw new Error('No data received from WhatsApp API');
    }

    // Save to database
    const channelData = {
      name,
      description,
      newsletter_pic: newsletter_pic || '',
      type: 'newsletter',
      credentials: {
        apiKey: process.env.WHAPI_KEY
      },
      data: response.data,
      createdAt: new Date(),
      status: 'active',
      messageCount: 0,
      successRate: '0%'
    };

    console.log('Saving channel data to database:', {
      ...channelData,
      newsletter_pic: channelData.newsletter_pic ? '[BASE64_IMAGE]' : ''
    });

    // Make request to your Node.js backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/channels/add-channel`;
    console.log('Making request to backend:', backendUrl);

    const dbResponse = await axios.post(backendUrl, channelData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}` // Add auth token if needed
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Backend Response:', dbResponse.data);

    if (!dbResponse.data) {
      throw new Error('No data received from backend');
    }

    return NextResponse.json({
      success: true,
      message: 'Channel created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error creating channel:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data ? '[DATA]' : undefined
      }
    });

    if (error.response) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error from external service',
          error: error.response.data,
          details: {
            status: error.response.status,
            statusText: error.response.statusText
          }
        },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 