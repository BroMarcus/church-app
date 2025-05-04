import React from "react";

export default function Dashboard() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-blue-700">Faith in the Valley</h1>
        <p className="text-gray-500">Church Operations Hub</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-2xl p-5">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">This Week's Schedule</h2>
          <ul className="list-disc list-inside text-sm text-gray-700">
            <li>Wed: Praise Team Practice @ 6pm</li>
            <li>Thu: Leaders Meeting @ 7pm</li>
            <li>Sun: Service @ 10am - Elder Martinez Preaching</li>
          </ul>
        </div>

        <div className="bg-white shadow-md rounded-2xl p-5">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Quick Links</h2>
          <ul className="space-y-2 text-sm text-blue-600">
            <li><a href="/schedule" className="hover:underline">📅 View Full Schedule</a></li>
            <li><a href="/messages" className="hover:underline">💬 Leader Messages</a></li>
            <li><a href="/studies" className="hover:underline">📖 Bible Study Topics</a></li>
          </ul>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-2xl p-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Latest Announcement</h2>
        <p className="text-sm text-gray-700">
          Don’t forget to bring a guest this Sunday for our community outreach service. Fellowship snacks will be provided after service in the youth room.
        </p>
      </div>
    </div>
  );
}
