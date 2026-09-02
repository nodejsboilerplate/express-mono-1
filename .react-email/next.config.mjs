
import path from 'path';
const emailsDirRelativePath = path.normalize('./emails');
const userProjectLocation = '/run/media/ubuntumahin/linux_files/workspace/projects/organizations/nodejsboilerplate/express-mono-1';
const previewServerLocation = '/run/media/ubuntumahin/linux_files/workspace/projects/organizations/nodejsboilerplate/express-mono-1/.react-email';
const rootDir = '/run/media/ubuntumahin/linux_files/workspace/projects/organizations/nodejsboilerplate/express-mono-1';
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_IS_BUILDING: 'true',
    REACT_EMAIL_INTERNAL_EMAILS_DIR_RELATIVE_PATH: emailsDirRelativePath,
    REACT_EMAIL_INTERNAL_EMAILS_DIR_ABSOLUTE_PATH: path.resolve(userProjectLocation, emailsDirRelativePath),
    REACT_EMAIL_INTERNAL_PREVIEW_SERVER_LOCATION: previewServerLocation,
    REACT_EMAIL_INTERNAL_USER_PROJECT_LOCATION: userProjectLocation
  },
  turbopack: {
    root: rootDir,
  },
  outputFileTracingRoot: rootDir,
  serverExternalPackages: ['esbuild'],
  typescript: {
    ignoreBuildErrors: true
  },
  staticPageGenerationTimeout: 600,
}

export default nextConfig