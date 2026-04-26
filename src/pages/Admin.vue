<template>
  <div class="admin-container">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <div class="admin-info">
        <p class="admin-email">Admin Menu</p>
      </div>
      <button @click="showSection('users')" :class="{ active: activeSection === 'users' }">
         Users Management
      </button>
      <button @click="showSection('meetings')" :class="{ active: activeSection === 'meetings' }">
         Active Meetings
      </button>
      <button @click="showSection('usage')" :class="{ active: activeSection === 'usage' }">
         Usage Analytics
      </button>
      <button @click="showSection('feedback')" :class="{ active: activeSection === 'feedback' }">
         Feedback & Reviews
      </button>
      <button @click="logoutAdmin" class="logout-btn"> Logout</button>
    </aside>

    <div class="main-content">
      <header class="admin-header">
        <h2>CoreTalk Admin Dashboard</h2>
        <p class="subtitle">Manage your video conferencing platform</p>
      </header>

      <main class="main-section">
        <!-- ============ USERS MANAGEMENT ============ -->
        <div v-if="activeSection === 'users'" class="section-container">
          <div class="section-header">
            <h2>👥 Registered Users</h2>
            <p class="section-desc">Manage all registered users and their accounts</p>
          </div>
          
          <div class="stats-cards">
            <div class="stat-card">
              <h3>{{ users.length }}</h3>
              <p>Total Users</p>
            </div>
            <!-- ✅ NEW: Verified vs Unverified counts -->
            <div class="stat-card stat-card--green">
              <h3>{{ users.filter(u => u.isVerified).length }}</h3>
              <p>Verified</p>
            </div>
            <div class="stat-card stat-card--red">
              <h3>{{ users.filter(u => !u.isVerified).length }}</h3>
              <p>Unverified</p>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="users.length === 0">
                  <td colspan="5" class="no-data">No users found</td>
                </tr>
                <tr v-for="user in users" :key="user._id">
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <span :class="user.isVerified ? 'badge-verified' : 'badge-unverified'">
                      {{ user.isVerified ? '✔ Verified' : '✘ Unverified' }}
                    </span>
                  </td>
                  <td>{{ formatDate(user.createdAt) }}</td>
                  <td>
                    <button @click="deleteUser(user._id, user.name)" class="btn-delete">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ============ ACTIVE MEETINGS ============ -->
        <div v-if="activeSection === 'meetings'" class="section-container">
          <div class="section-header">
            <h2>📹 Active Meetings</h2>
            <p class="section-desc">Monitor live meetings in real-time</p>
            <button @click="loadSectionData('meetings')" class="btn-refresh">
              🔄 Refresh
            </button>
          </div>

          <div class="stats-cards">
            <div class="stat-card">
              <h3>{{ meetings.length }}</h3>
              <p>Active Meetings</p>
            </div>
            <div class="stat-card">
              <h3>{{ totalParticipants }}</h3>
              <p>Total Participants</p>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Room ID</th>
                  <th>Host</th>
                  <th>Participants</th>
                  <th>Started At</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="meetings.length === 0">
                  <td colspan="5" class="no-data">No active meetings at the moment</td>
                </tr>
                <tr v-for="meeting in meetings" :key="meeting._id">
                  <td><strong>{{ meeting.roomId }}</strong></td>
                  <td>{{ meeting.host }}</td>
                  <td>
                    <span class="badge">{{ meeting.participantCount }}</span>
                  </td>
                  <td>{{ formatDate(meeting.startTime) }}</td>
                  <td>
                    <button @click="showParticipants(meeting)" class="btn-info">
                      👁️ View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ============ USAGE ANALYTICS ============ -->
        <div v-if="activeSection === 'usage'" class="section-container">
          <div class="section-header">
            <h2>📊 Usage Analytics</h2>
            <p class="section-desc">Platform statistics for {{ new Date().getFullYear() }}</p>
          </div>

          <!-- ✅ NEW: Guest account stats -->
          <div class="stats-cards" style="margin-bottom: 30px;">
            <div class="stat-card">
              <h3>{{ guestStats.totalGuests ?? '—' }}</h3>
              <p>Guest Accounts Created</p>
            </div>
            <div class="stat-card stat-card--green">
              <h3>{{ guestStats.activeGuests ?? '—' }}</h3>
              <p>Active Guest Accounts</p>
            </div>
            <div class="stat-card stat-card--red">
              <h3>{{ guestStats.inactiveGuests ?? '—' }}</h3>
              <p>Inactive Guest Accounts</p>
            </div>
            <div class="stat-card">
              <h3>{{ totalMeetingsThisYear }}</h3>
              <p>Total Meetings This Year</p>
            </div>
          </div>

          <!-- Chart -->
          <div class="chart-container">
            <canvas id="usageChart"></canvas>
          </div>
        </div>

        <!-- ============ FEEDBACK & REVIEWS ============ -->
        <div v-if="activeSection === 'feedback'" class="section-container">
          <div class="section-header">
            <h2>💬 User Feedback & Reviews</h2>
            <p class="section-desc">Reviews submitted by users after meetings</p>
          </div>

          <div class="stats-cards">
            <div class="stat-card">
              <h3>{{ feedbacks.length }}</h3>
              <p>Total Reviews</p>
            </div>
          </div>

          <div class="feedback-grid">
            <div v-if="feedbacks.length === 0" class="no-data">
              No feedback submitted yet
            </div>
            <div v-for="feedback in feedbacks" :key="feedback._id" class="feedback-card">
              <div class="feedback-header">
                <div>
                  <strong>{{ feedback.userName }}</strong>
                  <p class="feedback-email">{{ feedback.userEmail }}</p>
                </div>
                <span class="feedback-date">{{ formatDate(feedback.createdAt) }}</span>
              </div>
              <div class="feedback-body">
                <p>"{{ feedback.comment }}"</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Participants Modal -->
    <div v-if="showParticipantsModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Participants in Room: {{ selectedMeeting?.roomId }}</h3>
          <button @click="closeModal" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <ul class="participants-list">
            <li v-for="(participant, index) in selectedMeeting?.participants" :key="index">
              {{ participant }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { logout } from "../auth";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default {
  name: "Admin",
  data() {
    return {
      activeSection: "users",
      users: [],
      feedbacks: [],
      meetings: [],
      chartInstance: null,
      refreshInterval: null,
      showParticipantsModal: false,
      selectedMeeting: null,
      usageData: [],
      // ✅ NEW: guest stats object
      guestStats: {
        totalGuests: null,
        activeGuests: null,
        inactiveGuests: null,
      },
    };
  },
  computed: {
    totalParticipants() {
      return this.meetings.reduce((sum, m) => sum + m.participantCount, 0);
    },
    totalMeetingsThisYear() {
      return this.usageData.reduce((sum, m) => sum + m.totalMeetings, 0);
    },
  },
  methods: {
    showSection(section) {
      this.activeSection = section;
      this.loadSectionData(section);
    },

    async loadSectionData(section) {
      try {
        const token = localStorage.getItem("token");

        switch (section) {
          case "users":
            this.users = await this.fetchData("/api/admin/users", token);
            break;
          case "feedback":
            this.feedbacks = await this.fetchData("/api/admin/feedback", token);
            break;
          case "meetings":
            this.meetings = await this.fetchData("/api/admin/active-meetings", token);
            break;
          case "usage":
            // ✅ Fetch usage metrics and guest stats in parallel
            [this.usageData, this.guestStats] = await Promise.all([
              this.fetchData("/api/admin/usage-metrics", token),
              this.fetchData("/api/admin/guest-stats", token),
            ]);
            await this.loadUsageChart();
            break;
        }
      } catch (err) {
        console.error("❌ Error loading section:", err);
        alert("Failed to load data. Please check console for details.");
      }
    },

    async fetchData(endpoint, token) {
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
      return await res.json();
    },

    async deleteUser(userId, userName) {
      if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/admin/users/${userId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to delete user");
        alert("User deleted successfully");
        this.users = await this.fetchData("/api/admin/users", token);
      } catch (err) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user");
      }
    },

    showParticipants(meeting) {
      this.selectedMeeting = meeting;
      this.showParticipantsModal = true;
    },

    closeModal() {
      this.showParticipantsModal = false;
      this.selectedMeeting = null;
    },

    formatDate(dateString) {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    logoutAdmin() {
      logout();
      this.$router.push("/Login");
    },

    async loadUsageChart() {
      await this.$nextTick();
      const ctx = document.getElementById("usageChart");
      if (!ctx) return;
      if (this.chartInstance) this.chartInstance.destroy();

      const labels = this.usageData.map((d) => d.month);
      const chartData = this.usageData.map((d) => d.totalMeetings);

      this.chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Meetings per Month",
              data: chartData,
              backgroundColor: "#0056b3",
              borderColor: "#003d82",
              borderWidth: 2,
              borderRadius: 5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
          },
          plugins: {
            legend: { display: true, position: "top" },
          },
        },
      });
    },

    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        if (this.activeSection === "meetings") {
          this.loadSectionData("meetings");
        }
      }, 10000);
    },
  },

  async mounted() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login first");
        this.$router.push("/Login");
        return;
      }
      this.loadSectionData(this.activeSection);
      this.startAutoRefresh();
    } catch (err) {
      console.error("Error in mounted:", err);
    }
  },

  beforeUnmount() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.chartInstance) this.chartInstance.destroy();
  },
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.admin-container {
  display: flex;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  background-color: #f5f7fa;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #0056b3 0%, #003d82 100%);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px 15px;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.admin-info {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 20px;
  margin-bottom: 25px;
}

.admin-email {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: #fff;
  letter-spacing: 0.5px;
}

.sidebar button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  text-align: left;
  font-size: 15px;
  padding: 14px 16px;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.sidebar button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(5px);
}

.sidebar button.active {
  background: rgba(255, 255, 255, 0.25);
  font-weight: 600;
}

.logout-btn {
  margin-top: auto;
  background: rgba(220, 53, 69, 0.8) !important;
}

.logout-btn:hover {
  background: rgba(220, 53, 69, 1) !important;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-header {
  background: white;
  padding: 30px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.admin-header h2 {
  margin: 0 0 8px 0;
  color: #0056b3;
  font-size: 32px;
  font-weight: 700;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 15px;
}

.main-section {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.section-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-header {
  margin-bottom: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.section-header h2 {
  color: #0056b3;
  margin: 0 0 8px 0;
  font-size: 26px;
  font-weight: 700;
}

.section-desc {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.btn-refresh {
  background: #0056b3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-refresh:hover {
  background: #003d82;
  transform: translateY(-2px);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

/* ✅ Base stat card */
.stat-card {
  background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
  color: white;
  padding: 25px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 86, 179, 0.2);
}

/* ✅ Green variant for active/verified */
.stat-card--green {
  background: linear-gradient(135deg, #28a745 0%, #1a7a30 100%);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
}

/* ✅ Red variant for inactive/unverified */
.stat-card--red {
  background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
}

.stat-card h3 {
  font-size: 36px;
  margin: 0 0 8px 0;
  font-weight: 700;
}

.stat-card p {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

table thead {
  background: #0056b3;
  color: white;
}

table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
}

table td {
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  font-size: 14px;
}

table tbody tr {
  transition: background 0.2s ease;
}

table tbody tr:hover {
  background-color: #f8f9fa;
}

table thead th {
  color: #fff;
}

table tbody td {
  color: #000;
}

.no-data {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 40px !important;
}

/* ✅ Verified / Unverified badges */
.badge-verified {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background-color: #d4edda;
  color: #155724;
}

.badge-unverified {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background-color: #f8d7da;
  color: #721c24;
}

.btn-delete {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-2px);
}

.btn-info {
  padding: 8px 16px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-info:hover {
  background: #138496;
  transform: translateY(-2px);
}

.badge {
  background: #0056b3;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.chart-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  height: 400px;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.feedback-card {
  background: #f8f9fa;
  border-left: 4px solid #0056b3;
  border-radius: 0 8px 8px 0;
  padding: 20px;
  transition: all 0.3s ease;
}

.feedback-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}

.feedback-email {
  color: #666;
  font-size: 13px;
  margin: 4px 0 0 0;
}

.feedback-date {
  font-size: 12px;
  color: #999;
}

.feedback-body p {
  color: #333;
  line-height: 1.6;
  margin: 0;
  font-style: italic;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  background: #0056b3;
  color: white;
  padding: 20px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.3s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 25px;
  max-height: 60vh;
  overflow-y: auto;
}

.participants-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.participants-list li {
  padding: 12px 15px;
  background: #f8f9fa;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 3px solid #0056b3;
  font-size: 15px;
}

.main-section::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.main-section::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.main-section::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb {
  background: #0056b3;
  border-radius: 4px;
}

.main-section::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover {
  background: #003d82;
}

@media (max-width: 768px) {
  .admin-container {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 10px;
  }

  .sidebar button {
    min-width: 150px;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .feedback-grid {
    grid-template-columns: 1fr;
  }
}
</style>
