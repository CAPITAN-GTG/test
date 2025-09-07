import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-black mb-8">
          Real-time Mouse Sharing
        </h1>
        <p className="text-lg text-black mb-8">
          Share your mouse cursor with others in real-time
        </p>
        <Link 
          href="/mouse-room"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Enter Mouse Room
        </Link>
      </div>
    </div>
  );
}
