import React from "react";

export default function Dashboard() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Church Operations Hub</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-2">This Week's Schedule</h2>
          <ul className="list-disc list-inside text-sm">
            <li>Wed: Praise Team Practice @ 6pm</li>
            <li>Thu: Leaders Meeting @ 7pm</li>
            <li>Sun: Service @ 10am - Elder Martinez Preaching</li>
          </ul>
        </div>

        <div className="bg-white shadow rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-2">Quick Links</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="/schedule" className="text-blue-600 hover:underline">📅 View Full Schedule</a></li>
            <li><a href="/messages" className="text-blue-600 hover:underline">💬 Leader Messages</a></li>
            <li><a href="/studies" className="text-blue-600 hover:underline">📖 Bible Study Topics</a></li>
          </ul>
        </div>
      </div>

      <div className="bg-white shadow rounded-2xl p-4">
        <h2 className="text-xl font-semibold mb-2">Latest Announcement</h2>
        <p className="text-sm text-gray-700">Don’t forget to bring a guest this Sunday for our community outreach service. Fellowship snacks will be provided after service in the youth room.</p>
      </div>
    </div>
  );
}
