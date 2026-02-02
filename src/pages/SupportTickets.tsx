// src/pages/SupportTickets.tsx
import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Car,
  Send,
  X,
  Phone,
} from "lucide-react";
import type { SupportTicket, SupportMessage } from "../types/admin";

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Mock tickets
  const mockTickets: SupportTicket[] = [
    {
      _id: "1",
      ticketId: "TKT-2024-001234",
      userId: "user1",
      bookingId: "booking1",
      category: "Booking Issue",
      subcategory: "Driver not arrived",
      subject: "Driver is not responding",
      description:
        "I booked a tempo 30 minutes ago but the driver is not answering calls.",
      priority: "HIGH",
      status: "OPEN",
      attachments: [],
      lastMessageAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      user: {
        name: "Rahul Sharma",
        phone: "+91 98765 43210",
      },
    },
    {
      _id: "2",
      ticketId: "TKT-2024-001235",
      driverId: "driver1",
      category: "Payment Issue",
      subcategory: "Payment not received",
      subject: "Booking payment pending for 2 days",
      description:
        "I completed a booking 2 days ago but still haven't received the payment.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      assignedTo: "admin1",
      attachments: [],
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      driver: {
        name: "Amit Kumar",
        phone: "+91 98765 43220",
      },
    },
    {
      _id: "3",
      ticketId: "TKT-2024-001236",
      userId: "user2",
      bookingId: "booking2",
      category: "Refund",
      subcategory: "Cancellation refund",
      subject: "Refund not received for cancelled booking",
      description:
        "I cancelled my booking yesterday but haven't received the refund yet.",
      priority: "LOW",
      status: "WAITING_FOR_USER",
      assignedTo: "admin2",
      attachments: [],
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      user: {
        name: "Priya Patel",
        phone: "+91 98765 43211",
      },
    },
    {
      _id: "4",
      ticketId: "TKT-2024-001237",
      userId: "user3",
      category: "App Issue",
      subcategory: "App crashing",
      subject: "App crashes when I try to book",
      description:
        "Every time I try to select a vehicle, the app crashes. This has been happening since the last update.",
      priority: "URGENT",
      status: "OPEN",
      attachments: ["screenshot1.png"],
      lastMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      user: {
        name: "Vikram Singh",
        phone: "+91 98765 43212",
      },
    },
    {
      _id: "5",
      ticketId: "TKT-2024-001238",
      userId: "user4",
      bookingId: "booking3",
      category: "Feedback",
      subcategory: "Driver feedback",
      subject: "Excellent service by driver",
      description:
        "Just wanted to appreciate the driver for his excellent service. Very professional!",
      priority: "LOW",
      status: "RESOLVED",
      resolution:
        "Thanked user for positive feedback. Driver has been recognized.",
      resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      rating: 5,
      attachments: [],
      lastMessageAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      user: {
        name: "Sneha Desai",
        phone: "+91 98765 43213",
      },
    },
  ];

  // Mock messages
  const mockMessages: SupportMessage[] = [
    {
      _id: "m1",
      ticketId: "1",
      senderId: "user1",
      senderType: "USER",
      senderName: "Rahul Sharma",
      message:
        "I booked a tempo 30 minutes ago but the driver is not answering calls. Please help!",
      attachments: [],
      isRead: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      _id: "m2",
      ticketId: "1",
      senderId: "system",
      senderType: "SYSTEM",
      senderName: "System",
      message:
        "Your ticket has been created. Our support team will respond shortly.",
      attachments: [],
      isRead: true,
      createdAt: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
    },
    {
      _id: "m3",
      ticketId: "1",
      senderId: "admin1",
      senderType: "ADMIN",
      senderName: "Support Agent",
      message:
        "Hi Rahul, I apologize for the inconvenience. I'm contacting the driver now. Could you please share your booking ID?",
      attachments: [],
      isRead: true,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      _id: "m4",
      ticketId: "1",
      senderId: "user1",
      senderType: "USER",
      senderName: "Rahul Sharma",
      message: "Booking ID is MZY-2024-001234",
      attachments: [],
      isRead: true,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setTickets(mockTickets);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      // Load messages for selected ticket
      setMessages(
        mockMessages.filter((m) => m.ticketId === selectedTicket._id),
      );
    }
  }, [selectedTicket]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.driver?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || ticket.status === statusFilter;
    const matchesPriority =
      priorityFilter === "ALL" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    open: tickets.filter((t) => t.status === "OPEN").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    urgent: tickets.filter(
      (t) =>
        t.priority === "URGENT" &&
        t.status !== "RESOLVED" &&
        t.status !== "CLOSED",
    ).length,
    resolved: tickets.filter(
      (t) => t.status === "RESOLVED" || t.status === "CLOSED",
    ).length,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "WAITING_FOR_USER":
        return "bg-purple-100 text-purple-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const message: SupportMessage = {
      _id: Date.now().toString(),
      ticketId: selectedTicket._id,
      senderId: "admin",
      senderType: "ADMIN",
      senderName: "Support Agent",
      message: newMessage,
      attachments: [],
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (selectedTicket.status === "OPEN") {
      setTickets(
        tickets.map((t) =>
          t._id === selectedTicket._id
            ? { ...t, status: "IN_PROGRESS" as const }
            : t,
        ),
      );
      setSelectedTicket({ ...selectedTicket, status: "IN_PROGRESS" });
    }
  };

  const handleResolve = () => {
    if (!selectedTicket) return;
    setTickets(
      tickets.map((t) =>
        t._id === selectedTicket._id
          ? {
              ...t,
              status: "RESOLVED" as const,
              resolvedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
    setSelectedTicket({ ...selectedTicket, status: "RESOLVED" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-movezy-500" />
            Support Tickets
          </h2>
          <p className="text-sm text-gray-500">
            Manage customer support requests
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stats.open}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.inProgress}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Urgent</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.urgent}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center animate-pulse">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.resolved}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_USER">Waiting</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                <option value="ALL">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No tickets found
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTicket?._id === ticket._id
                      ? "bg-movezy-50 border-l-4 border-movezy-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-gray-500">
                      {ticket.ticketId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800 text-sm mb-1 line-clamp-1">
                    {ticket.subject}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {ticket.user ? (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {ticket.user.name}
                      </span>
                    ) : ticket.driver ? (
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {ticket.driver.name}
                      </span>
                    ) : null}
                    <span>•</span>
                    <span>{getTimeAgo(ticket.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {selectedTicket ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-500">
                        {selectedTicket.ticketId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}
                      >
                        {selectedTicket.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}
                      >
                        {selectedTicket.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800">
                      {selectedTicket.subject}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedTicket.category} • {selectedTicket.subcategory}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contact Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                      {selectedTicket.user ? (
                        <User className="w-5 h-5 text-movezy-600" />
                      ) : (
                        <Car className="w-5 h-5 text-movezy-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {selectedTicket.user?.name ||
                          selectedTicket.driver?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedTicket.user?.phone ||
                          selectedTicket.driver?.phone}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`tel:${selectedTicket.user?.phone || selectedTicket.driver?.phone}`}
                    className="p-2 bg-movezy-500 text-white rounded-lg hover:bg-movezy-600"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl p-4 ${
                        msg.senderType === "ADMIN"
                          ? "bg-movezy-500 text-white"
                          : msg.senderType === "SYSTEM"
                            ? "bg-gray-200 text-gray-600"
                            : "bg-white text-gray-800 shadow-sm"
                      }`}
                    >
                      {msg.senderType !== "ADMIN" && (
                        <p
                          className={`text-xs font-medium mb-1 ${msg.senderType === "SYSTEM" ? "text-gray-500" : "text-gray-500"}`}
                        >
                          {msg.senderName}
                        </p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${msg.senderType === "ADMIN" ? "text-movezy-100" : "text-gray-400"}`}
                      >
                        {getTimeAgo(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "RESOLVED" &&
                selectedTicket.status !== "CLOSED" && (
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSendMessage()
                        }
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-3 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600 disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleResolve}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        Mark as Resolved
                      </button>
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                        Escalate
                      </button>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
