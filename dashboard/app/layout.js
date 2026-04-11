import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Zero-Trust Gateway',
  description: 'Real-time API security monitoring'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}