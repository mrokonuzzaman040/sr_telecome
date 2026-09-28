import { NextResponse } from 'next/server';

// Mobile app version information
const APP_VERSION = {
  current: '1.0.0',
  latest: '1.0.0',
  minSupported: '1.0.0',
  releaseDate: '2026-09-28',
  downloadUrl: 'https://github.com/mrokonuzzaman040/sr_telecome/releases/latest',
  releaseNotes: [
    'Initial release with POS functionality',
    'Sales persistence fixed',
    'Database connection optimized',
    'Rate limiting implemented',
    'Auto-update feature added'
  ],
  forceUpdate: false
};

export async function GET(req: NextRequest) {
  try {
    // Check for update header from mobile app
    const currentVersion = req.headers.get('X-App-Version') || '1.0.0';
    
    // Compare versions
    const needsUpdate = compareVersions(currentVersion, APP_VERSION.latest);
    const forceUpdate = compareVersions(currentVersion, APP_VERSION.minSupported) < 0;
    
    return NextResponse.json({
      success: true,
      version: APP_VERSION,
      needsUpdate,
      forceUpdate: forceUpdate || APP_VERSION.forceUpdate,
      currentVersion
    });
  } catch (error) {
    console.error('Version check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check version' },
      { status: 500 }
    );
  }
}

// Simple version comparison (major.minor.patch)
function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (currentParts[i] < latestParts[i]) return -1;
    if (currentParts[i] > latestParts[i]) return 1;
  }
  
  return 0;
}
