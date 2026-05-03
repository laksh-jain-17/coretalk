<template>
  <div class="settings-page">
    <div class="container">
      <h1 class="page-title">Settings</h1>

      <!-- User Profile Section -->
      <div class="section" v-if="!isGuest">
        <div class="section-header">
          <h2>Profile</h2>
        </div>
        <div class="section-content profile-content">
          <div class="avatar">
            {{ userInitial }}
          </div>
          <div class="profile-info">
            <div class="profile-field">
              <span class="profile-label">Name</span>
              <span class="profile-value">{{ userName || 'N/A' }}</span>
            </div>
            <div class="profile-field">
              <span class="profile-label">Email</span>
              <span class="profile-value">{{ userEmail || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Complaint Section -->
      <div class="section" v-if="!isGuest">
        <div class="section-header">
          <h2>Complaint / Report</h2>
        </div>
        <div class="section-content">
          <div class="tabs">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'complaint' }"
              @click="activeTab = 'complaint'"
            >Submit a Complaint</button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'report' }"
              @click="activeTab = 'report'"
            >Report a User</button>
          </div>

          <!-- Complaint Form -->
          <div v-if="activeTab === 'complaint'">
            <div class="form-group">
              <label for="complaintSubject">Subject</label>
              <input
                type="text"
                id="complaintSubject"
                v-model="complaintSubject"
                placeholder="Brief subject of your complaint"
                class="input-field"
              />
            </div>
            <div class="form-group">
              <label for="complaintMessage">Description</label>
              <textarea
                id="complaintMessage"
                v-model="complaintMessage"
                placeholder="Describe your complaint in detail..."
                class="textarea-field"
                rows="4"
              ></textarea>
            </div>
            <button class="btn btn-blue" @click="submitComplaint">Submit Complaint</button>
          </div>

          <!-- Report User Form -->
          <div v-if="activeTab === 'report'">
            <div class="form-group">
              <label for="username">Username of User</label>
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
      </div>

      <!-- FAQ Section -->
      <div class="section">
        <div class="section-header">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div class="section-content faq-content">
          <div
            v-for="(group, gi) in faqGroups"
            :key="gi"
            class="faq-group"
          >
            <h3 class="faq-group-title">{{ group.title }}</h3>
            <div
              v-for="(item, qi) in group.items"
              :key="qi"
              class="faq-item"
            >
              <button
                class="faq-question"
                @click="toggleFaq(gi, qi)"
              >
                <span>{{ item.q }}</span>
                <span class="faq-icon">{{ openFaq === `${gi}-${qi}` ? '−' : '+' }}</span>
              </button>
              <div class="faq-answer" :class="{ open: openFaq === `${gi}-${qi}` }">
                <div class="faq-answer-inner">
                  <p>{{ item.a }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Account Section -->
      <div class="section" v-if="!isGuest">
        <div class="section-header danger">
          <h2>Delete Account</h2>
        </div>
        <div class="section-content">
          <p class="warning-text">
            Warning: This action is permanent and cannot be undone. All your data will be permanently deleted.
          </p>
          <button class="btn btn-danger" @click="deleteAccount">Delete My Account</button>
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
      userName: '',
      userEmail: '',

      activeTab: 'complaint',

      complaintSubject: '',
      complaintMessage: '',

      reportUsername: '',
      reportReason: '',

      openFaq: null,
      isGuest: localStorage.getItem('isGuest') === 'true',

      faqGroups: [
        {
          title: 'Account & Profile',
          items: [
            {
              q: 'How do I create a CoreTalk account?',
              a: 'Visit the CoreTalk homepage and click "Sign Up". Enter your name, email address, and a secure password to create your account.'
            },
            {
              q: 'Can I change my display name or email?',
              a: 'Currently, profile editing is not available directly in the app. Please contact support if you need to update your account details.'
            }
          ]
        },
        {
          title: 'Meetings',
          items: [
            {
              q: 'How do I create a new meeting room?',
              a: 'Once logged in, click the "New Meeting" button on your dashboard. A unique passcode will be generated for your meeting room.'
            },
            {
              q: 'How do I join a meeting using a passcode?',
              a: 'Click "Join Meeting" on the dashboard and enter the alphanumeric passcode shared by the host to enter the room.'
            },
            {
              q: 'Where can I find my meeting passcode to share with others?',
              a: 'After creating a meeting, your unique passcode is displayed on screen. Copy and share it with participants so they can join your room.'
            },
            {
              q: 'How many people can join a meeting at once?',
              a: 'CoreTalk supports multiple participants per meeting room. For large gatherings, ensure a stable internet connection for the best experience.'
            }
          ]
        },
        {
          title: 'During a Call',
          items: [
            {
              q: 'What is the chat feature and how do I use it?',
              a: 'The in-call chat lets you send text messages to all participants during a meeting. Click the chat icon in the meeting toolbar to open the chat panel.'
            },
            {
              q: 'How do I allow someone to attend my call?',
              a: 'Share your meeting passcode with the person you want to invite. Anyone with the correct passcode can join your meeting room.'
            },
            {
              q: 'Can I go fullscreen during a meeting?',
              a: 'Yes! Click the fullscreen icon in the meeting controls or press F11 in your browser to enter fullscreen mode for a distraction-free experience.'
            },
            {
              q: 'How do I start recording a meeting?',
              a: 'Click the record button in the meeting toolbar to start recording. The recording will be saved and accessible after the meeting ends.'
            },
            {
              q: 'What is background noise suppression and how does it work?',
              a: 'Background noise suppression filters out ambient sounds like keyboard clicks or background chatter, so other participants only hear your voice clearly. You can toggle it from the audio settings inside the meeting.'
            },
            {
              q: 'What is Gmail Enact?',
              a: 'The Gmail Enact lets you to send emails and check inbox mails without opening another tab, preventing context switching and also saves 200-350 MB of RAM. Coretalk is equipped with features which lets you do your important task during the meeting with ease.'
            },
            {
              q: 'What is Doc Enact?',
              a: 'Similar to Google Docs lets you to make a document, initially controlled mainly by host, it lets other users / participants to edit or write into same doc simultaneously and download them. It has all the basic features like unordered list, ordered list, bold, italic and underline writing.'
            },
            {
              q: 'What about Whiteboard?',
              a: 'To illustrate something by the host or other participants open whiteboard, click share screen and draw what you want. It\'s that easy'
            }
          ]
        },
        {
          title: 'Privacy & Safety',
          items: [
            {
              q: 'Is my meeting end-to-end encrypted?',
              a: 'CoreTalk uses secure WebRTC protocols to protect your calls. All media streams are encrypted in transit to ensure your privacy.'
            },
            {
              q: 'Can I report someone for inappropriate behavior?',
              a: 'Yes. Go to Settings → Complaint / Report, switch to the "Report a User" tab, enter their username, and describe the issue. Our team will review it promptly.'
            },
            {
              q: 'How do I leave or end a meeting?',
              a: 'Click the red "Leave" or "End Meeting" button in the meeting controls. As a host, ending the meeting will disconnect all participants.'
            }
          ]
        },
        {
          title: 'Technical',
          items: [
            {
              q: 'What should I do if my audio or video isn\'t working?',
              a: 'Make sure your browser has permission to access your camera and microphone. Try refreshing the page, checking your device settings, or switching browsers.'
            },
            {
              q: 'Which browsers does CoreTalk support?',
              a: 'CoreTalk works best on Google Chrome and Microsoft Edge. Firefox and Safari are also supported but may have limited functionality for some features.'
            }
          ]
        }
      ]
    }
  },
  computed: {
    userInitial() {
      return this.userName ? this.userName.charAt(0).toUpperCase() : '?'
    }
  },
  mounted() {
    this.loadUserProfile()
  },
  methods: {
    async loadUserProfile() {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/schedule`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (response.ok) {
          this.userName = data.user.name || ''
          this.userEmail = data.user.email || ''
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    },
    
    toggleFaq(gi, qi) {
      const key = `${gi}-${qi}`
      this.openFaq = this.openFaq === key ? null : key
    },

    async submitComplaint() {
      if (!this.complaintSubject || !this.complaintMessage) {
        alert('Please fill out all fields.')
        return
      }
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/complaint`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subject: this.complaintSubject,
            message: this.complaintMessage
          })
        })
        const data = await response.json()
        if (response.ok) {
          alert('Complaint submitted successfully.')
          this.complaintSubject = ''
          this.complaintMessage = ''
        } else {
          alert(data.msg || 'Failed to submit complaint.')
        }
      } catch (error) {
        console.error('Error submitting complaint:', error)
        alert('Server error.')
      }
    },

    async submitReport() {
      if (!this.reportUsername || !this.reportReason) {
        alert('Please fill out all fields.')
        return
      }
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            username: this.reportUsername,
            reason: this.reportReason
          })
        })
        const data = await response.json()
        if (response.ok) {
          alert('Report submitted successfully.')
          this.reportUsername = ''
          this.reportReason = ''
        } else {
          alert(data.msg || 'Failed to submit report.')
        }
      } catch (error) {
        console.error('Error submitting report:', error)
        alert('Server error.')
      }
    },

    async deleteAccount() {
      const confirmDelete = confirm('Are you sure you want to delete your account permanently?')
      if (!confirmDelete) return
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/delete-account`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (response.ok) {
          alert('Account deleted successfully.')
          localStorage.removeItem('token')
          this.$router.push('/')
        } else {
          alert(data.msg || 'Failed to delete account.')
        }
      } catch (error) {
        console.error('Error deleting account:', error)
        alert('Server error.')
      }
    }
  }
}
</script>

<style scoped>
/* ── Base ── */
.settings-page {
  background-color: white;
  min-height: 100vh;
  height: 100%;
  overflow-y: auto;
  padding: 32px 20px 60px;
  box-sizing: border-box;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.page-title {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #1a1a1a;
}

/* ── Sections ── */
/* NOTE: overflow is NOT set to hidden here so FAQ accordion is never clipped */
.section {
  margin-bottom: 28px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
}

.section-header {
  background-color: #f5f5f5;
  padding: 14px 20px;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 10px 10px 0 0;
}

.section-header.danger {
  background-color: #fff0f0;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.section-content {
  padding: 20px;
}

/* ── Profile ── */
.profile-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #2563eb;
  color: white;
  font-size: 26px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-label {
  font-weight: 600;
  color: #666;
  font-size: 13px;
  width: 45px;
}

.profile-value {
  color: #1a1a1a;
  font-size: 15px;
  word-break: break-all;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d0d0d0;
  background: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}

/* ── Form ── */
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
  box-sizing: border-box;
}

.input-field:focus,
.textarea-field:focus {
  outline: none;
  border-color: #2563eb;
}

/* ── Buttons ── */
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

.btn-danger {
  background-color: white;
  color: #dc2626;
  border-color: #dc2626;
}

.btn-danger:hover {
  background-color: #fef2f2;
}

.warning-text {
  color: #dc2626;
  margin-bottom: 15px;
  line-height: 1.5;
  font-size: 14px;
}

/* ── FAQ ── */
.faq-content {
  padding: 10px 20px 4px;
}

.faq-group {
  margin-bottom: 24px;
}

.faq-group-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #2563eb;
  margin-bottom: 6px;
  margin-top: 0;
}

.faq-item {
  border-bottom: 1px solid #f0f0f0;
}

.faq-question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  padding: 14px 0;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  text-align: left;
  gap: 12px;
  font-family: inherit;
}

.faq-question:hover {
  color: #2563eb;
}

.faq-icon {
  font-size: 20px;
  color: #2563eb;
  flex-shrink: 0;
  line-height: 1;
}

/* accordion — uses grid trick so height animates smoothly without JS */
.faq-answer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s ease;
}

.faq-answer.open {
  grid-template-rows: 1fr;
}

.faq-answer-inner {
  overflow: hidden;
}

.faq-answer p {
  padding-bottom: 14px;
  margin: 0;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

/* ── Tablet (≤ 768px) ── */
@media (max-width: 768px) {
  .settings-page {
    padding: 20px 14px 50px;
  }

  .page-title {
    font-size: 26px;
    margin-bottom: 22px;
  }

  .section-header h2 {
    font-size: 16px;
  }

  .section-content {
    padding: 16px;
  }

  .faq-content {
    padding: 8px 16px 4px;
  }

  .avatar {
    width: 54px;
    height: 54px;
    font-size: 22px;
  }

  .profile-value {
    font-size: 14px;
  }

  .tab-btn {
    font-size: 13px;
    padding: 7px 12px;
  }

  .faq-question {
    font-size: 13px;
  }

  .btn {
    width: 100%;
    text-align: center;
  }
}

/* ── Mobile (≤ 480px) ── */
@media (max-width: 480px) {
  .settings-page {
    padding: 16px 10px 40px;
  }

  .page-title {
    font-size: 22px;
    margin-bottom: 18px;
  }

  .profile-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .profile-field {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .profile-label {
    width: auto;
  }

  .tabs {
    flex-direction: column;
    gap: 6px;
  }

  .tab-btn {
    width: 100%;
    text-align: center;
  }

  .section-content {
    padding: 14px 12px;
  }

  .faq-content {
    padding: 6px 12px 4px;
  }

  .faq-question {
    font-size: 13px;
    padding: 12px 0;
  }

  .section-header {
    padding: 12px 14px;
  }

  .section-header h2 {
    font-size: 15px;
  }
}
</style>
