import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <span className="material-symbols-rounded text-7xl text-primary mb-4">search_off</span>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-gray-400 mb-6">Halaman yang kamu cari tidak ditemukan.</p>
      <Link
        to="/inventory"
        className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/80 transition"
      >
        Kembali ke Katalog
      </Link>
    </div>
  );
}

export default NotFoundPage;
