// Google Sheets Configuration
const SHEET_ID = '1Di2jt1B6wkOb4tq8Kf5fNJ9j8jU4yyrxHp3QZphgLMI'; // Replace with your actual sheet ID
const API_KEY = 'AIzaSyAnDYkS8j4gXIP5fQUKdsAdFtb1hUasT0o'; // Replace with your actual API key
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtjvFMcgCYVtHzRVrCOocwb3P_ooOTyea78hB1OyIvmJ_tCyN3XCKNAOz_v_t5SnbR/exec'; // Replace with your Google Apps Script URL

// Global variables
let currentUser = null;
let isAdminMode = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let events = {};
let userPolls = {};
let selectedUserFromList = null;

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// User management functions
function getStoredUsers() {
    try {
        const users = localStorage.getItem('oddsCalendar_users');
        return users ? JSON.parse(users) : [];
    } catch (error) {
        return [];
    }
}

function saveUser(userName) {
    try {
        let users = getStoredUsers();
        if (!users.includes(userName)) {
            users.push(userName);
            localStorage.setItem('oddsCalendar_users', JSON.stringify(users));
        }
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

function displayUserList() {
    const users = getStoredUsers();
    const userList = document.getElementById('userList');
    const