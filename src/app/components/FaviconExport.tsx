import { Logo } from './Logo';

export function FaviconExport() {
  return (
    <div className="p-8 space-y-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold">MyDaily Favicon Export</h1>
      <p className="text-gray-600">
        Screenshot atau export SVG di bawah ini untuk membuat favicon dalam berbagai ukuran.
      </p>

      <div className="space-y-6">
        {/* 16x16 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">16x16 (Browser Tab)</h2>
          <div className="inline-block border-2 border-gray-300">
            <Logo size={16} />
          </div>
        </div>

        {/* 32x32 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">32x32 (Browser Tab Retina)</h2>
          <div className="inline-block border-2 border-gray-300">
            <Logo size={32} />
          </div>
        </div>

        {/* 64x64 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">64x64 (Desktop Icon)</h2>
          <div className="inline-block border-2 border-gray-300">
            <Logo size={64} />
          </div>
        </div>

        {/* 192x192 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">192x192 (Android Chrome)</h2>
          <div className="inline-block border-2 border-gray-300">
            <Logo size={192} />
          </div>
        </div>

        {/* 512x512 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">512x512 (PWA Splash Screen)</h2>
          <div className="inline-block border-2 border-gray-300">
            <Logo size={512} />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Cara Export:</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Buka halaman ini di browser</li>
          <li>Klik kanan pada masing-masing icon</li>
          <li>Pilih "Save Image As..." atau screenshot dengan tool</li>
          <li>Simpan dengan nama: favicon-16x16.png, favicon-32x32.png, dst.</li>
          <li>Atau copy SVG code dari developer tools</li>
        </ol>
      </div>
    </div>
  );
}
