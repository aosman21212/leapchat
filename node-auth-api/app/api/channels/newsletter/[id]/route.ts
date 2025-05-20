import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, newsletter_pic, reactions = 'all' } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Validate image format if provided
    if (newsletter_pic && !newsletter_pic.startsWith('data:image/jpeg;base64,')) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be JPEG in base64 format.' },
        { status: 400 }
      );
    }

    // Prepare request data
    const requestData = {
      name: name.trim(),
      description: description.trim(),
      ...(newsletter_pic && { newsletter_pic }),
      reactions
    };

    console.log('Making request to WhatsApp API:', {
      url: `https://gate.whapi.cloud/newsletters/${params.id}`,
      data: { ...requestData, newsletter_pic: newsletter_pic ? '[BASE64_IMAGE]' : undefined }
    });

    // Make request to WhatsApp API
    const response = await axios.patch(
      `https://gate.whapi.cloud/newsletters/${params.id}`,
      requestData,
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${process.env.WHAPI_KEY}`,
          'content-type': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('WhatsApp API Response:', response.data);

    // Return the WhatsApp API response
    return NextResponse.json({
      success: true,
      message: 'Newsletter updated successfully',
      data: response.data
    });

  } catch (error: any) {
    console.error('Error updating newsletter:', error);

    if (error.response) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error from WhatsApp API',
          error: error.response.data
        },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating the newsletter',
        error: error.message
      },
      { status: 500 }
    );
  }
} 