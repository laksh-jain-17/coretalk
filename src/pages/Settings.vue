<template>
  <div class="settings-page">
    <div class="container">
      <h1 class="page-title">Settings</h1>

      <!-- Report Abuse Section -->
      <div class="section">
        <div class="section-header">
          <h2>Report Abuse</h2>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label for="username">Username of Culprit</label>
            <input 
              type="text" 
              id="username"
              v-model="reportUsername"
              placeholder="Enter username"
              class="input-field"
            />
          </div>
          <div class="form-group">
            <label for="reason">Reason for Report</label>
            <textarea 
              id="reason"
              v-model="reportReason"
              placeholder="Describe the issue..."
              class="textarea-field"
              rows="4"
            ></textarea>
          </div>
          <button class="btn btn-blue" @click="submitReport">Submit Report</button>
        </div>
      </div>

      <!-- Delete Account Section -->
      <div class="section">
        <div class="section-header danger">
          <h2>Delete Account</h2>
        </div>
        <div class="section-content">
          <p class="warning-text">
            Warning: This action is permanent and cannot be undone. All your data will be permanently deleted.
          </p>
          <button class="btn btn-white" @click="deleteAccount">Delete My Account</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsPage',
  data() {
    return {
      reportUsername: '',
      reportReason: ''
    }
  },
  methods: {
    async submitReport() {
      if (!this.reportUsername || !this.reportReason) {
        alert("Please fill out all fields.");
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/auth/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            username: this.reportUsername,
            reason: this.reportReason
          })
        });
        const data = await response.json();
        if (response.ok) {
          alert("Report submitted successfully.");
          this.reportUsername = "";
          this.reportReason = "";
        } else {
          alert(data.msg || "Failed to submit report.");
        }
      } catch (error) {
        console.error("Error submitting report:", error);
        alert("Server error.");
      }
    },

    async deleteAccount() {
      const confirmDelete = confirm("Are you sure you want to delete your account permanently?");
      if (!confirmDelete) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/auth/delete-account", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          alert("Account deleted successfully.");
          localStorage.removeItem("token");
          this.$router.push("/");
        } else {
          alert(data.msg || "Failed to delete account.");
        }
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Server error.");
      }
    }
  }
}
</script>

<style scoped>
.settings-page {
  background-color: white;
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #1a1a1a;
}

.section {
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  background-color: #f5f5f5;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.section-header.danger {
  background-color: #fee;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.section-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.input-field,
.textarea-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.input-field:focus,
.textarea-field:focus {
  outline: none;
  border-color: #2563eb;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d0d0d0;
}

.btn-blue {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}

.btn-blue:hover {
  background-color: #1d4ed8;
}

.btn-white {
  background-color: white;
  color: #333;
  border-color: #d0d0d0;
}

.btn-white:hover {
  background-color: #f5f5f5;
}

.warning-text {
  color: #dc2626;
  margin-bottom: 15px;
  line-height: 1.5;
}
</style>
