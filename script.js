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
    const selectBtn = document.getElementById('selectUserBtn');
    const orDivider = document.getElementById('orDivider');
    
    if (users.length > 0) {
        userList.innerHTML = '';
        users.forEach(user => {
            const userOption = document.createElement('div');
            userOption.className = 'user-option';
            userOption.textContent = user;
            userOption.onclick = () => selectUser(user, userOption);
            userList.appendChild(userOption);
        });
        
        userList.style.display = 'block';
        selectBtn.style.display = 'block';
        orDivider.style.display = 'block';
    }
}

function selectUser(userName, element) {
    // Remove previous selection
    document.querySelectorAll('.user-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked element
    element.classList.add('selected');
    selectedUserFromList = userName;
}

function selectExistingUser() {
    if (!selectedUserFromList) {
        alert('Please select a user from the list');
        return;
    }
    
    currentUser = selectedUserFromList;
    completeLogin();
}

function loginUser() {
    const nameInput = document.getElementById('loginNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    currentUser = name;
    saveUser(name); // Save to user list
    completeLogin();
}

function completeLogin() {
    // Hide login modal
    document.getElementById('loginModal').style.display = 'none';
    
    // Show main content
    document.getElementById('contentWrapper').classList.add('visible');
    
    // Update user display
    document.getElementById('currentUserDisplay').innerHTML = 
        `Welcome, <strong>${currentUser}</strong>! You can now view and poll on events.`;
    document.getElementById('currentUserDisplay').style.display = 'block';
    
    // Save current user
    localStorage.setItem('oddsCalendar_currentUser', currentUser);
    
    // Initialize calendar
    init();
}

function showUserSwitcher() {
    currentUser = null;
    selectedUserFromList = null;
    
    // Clear input
    document.getElementById('loginNameInput').value = '';
    
    // Hide main content
    document.getElementById('contentWrapper').classList.remove('visible');
    
    // Show login modal
    document.getElementById('loginModal').style.display = 'flex';
    displayUserList();
}

// Google Sheets API functions
async function loadEventsFromSheets() {
    try {
        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            console.log('Google Sheets not configured, using localStorage');
            loadData();
            generateUpcomingEvents(); // Generate after loading from localStorage
            return;
        }

        // Load Events
        const eventsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Events?key=${API_KEY}`
        );
        const eventsData = await eventsResponse.json();
        
        // Load Polls
        const pollsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Polls?key=${API_KEY}`
        );
        const pollsData = await pollsResponse.json();

        // Process events data
        events = {};
        if (eventsData.values && eventsData.values.length > 1) {
            for (let i = 1; i < eventsData.values.length; i++) {
                const row = eventsData.values[i];
                if (row.length >= 3) { // At least ID, Title, Date required
                    const id = row[0];
                    const title = row[1] ? row[1].trim() : '';
                    const date = row[2];
                    const time = row[3] || '';
                    const description = row[4] || '';
                    
                    if (!events[date]) {
                        events[date] = [];
                    }
                    
                    events[date].push({
                        id: parseInt(id),
                        title,
                        date,
                        time,
                        description,
                        polls: {}
                    });
                }
            }
        }

        // Process polls data
        if (pollsData.values && pollsData.values.length > 1) {
            for (let i = 1; i < pollsData.values.length; i++) {
                const row = pollsData.values[i];
                const [eventId, userName, attending, timestamp] = row;
                
                console.log(`📥 Loading poll: Event ${eventId}, User "${userName}", Attending: "${attending}" (type: ${typeof attending})`);
                console.log(`🔍 Debug: attending value = "${attending}"`);
                console.log(`🔍 Debug: attending.toString() = "${attending.toString()}"`);
                console.log(`🔍 Debug: attending.toString().toLowerCase() = "${attending.toString().toLowerCase()}"`);
                console.log(`🔍 Debug: comparison result = ${attending.toString().toLowerCase() === 'true'}`);
                
                // Find the event and add the poll
                for (let dateKey in events) {
                    const event = events[dateKey].find(e => e.id === parseInt(eventId));
                    if (event) {
                        // Handle both "TRUE"/"true" and "FALSE"/"false" 
                        const attendingBool = attending && (attending.toString().toLowerCase() === 'true');
                        event.polls[userName] = {
                            attending: attendingBool,
                            timestamp: timestamp
                        };
                        console.log(`📝 Poll processed: User "${userName}" attending: ${attendingBool} for event "${event.title}"`);
                    }
                }
            }
        }

        console.log('Data loaded from Google Sheets');
        
        // Generate upcoming events after data is fully loaded
        generateUpcomingEvents();
        
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        // Fallback to localStorage
        loadData();
        generateUpcomingEvents(); // Generate after fallback loading
    }
}

async function saveEventToSheets(event) {
    try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
            console.log('Google Apps Script not configured, saving to localStorage only');
            saveData();
            return;
        }

        // Use fetch with no-cors mode to bypass CORS issues
        const formData = new FormData();
        formData.append('data', JSON.stringify({
            action: 'addEvent',
            event: event
        }));

        console.log('Saving event to Google Sheets...');
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });

        console.log('Event submitted to Google Sheets (no-cors mode)');
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        saveData(); // Fallback to localStorage
    }
}

async function savePollToSheets(eventId, userName, attending, timestamp) {
    try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
            console.log('Google Apps Script not configured, saving to localStorage only');
            saveData();
            return;
        }

        // Use fetch with no-cors mode to bypass CORS issues
        const formData = new FormData();
        formData.append('data', JSON.stringify({
            action: 'addPoll',
            eventId: eventId,
            userName: userName,
            attending: attending.toString(), // Ensure it's a string
            timestamp: timestamp
        }));

        console.log(`Saving poll to Google Sheets: ${userName} -> ${attending}`);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });

        console.log('Poll submitted to Google Sheets (no-cors mode)');
        
    } catch (error) {
        console.error('Error saving poll to Google Sheets:', error);
        saveData(); // Fallback to localStorage
    }
}

// Load data from localStorage (fallback)
function loadData() {
    try {
        const savedEvents = localStorage.getItem('oddsCalendar_events');
        const savedUser = localStorage.getItem('oddsCalendar_currentUser');
        
        if (savedEvents) {
            events = JSON.parse(savedEvents);
        }
        
        if (savedUser) {
            currentUser = savedUser;
            document.getElementById('currentUserDisplay').innerHTML = 
                `👤 Welcome back, <strong>${currentUser}</strong>! You can now view and poll on events.`;
            document.getElementById('currentUserDisplay').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading data:', error);
        events = {};
        currentUser = null;
    }
}

// Save data to localStorage (fallback)
function saveData() {
    try {
        localStorage.setItem('oddsCalendar_events', JSON.stringify(events));
        if (currentUser) {
            localStorage.setItem('oddsCalendar_currentUser', currentUser);
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Initialize calendar
async function init() {
    await loadEventsFromSheets(); // Wait for data to load completely
    updateCalendarDisplay();
    generateCalendar();
    // generateUpcomingEvents(); // This is now called inside loadEventsFromSheets
}

// Check for existing user on page load
async function checkExistingUser() {
    const savedUser = localStorage.getItem('oddsCalendar_currentUser');
    
    if (savedUser) {
        // Auto-login existing user
        currentUser = savedUser;
        await completeLogin();
    } else {
        // Show login modal for new users
        displayUserList();
        document.getElementById('loginModal').style.display = 'flex';
    }
}

// Set current user
function setCurrentUser() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (name) {
        currentUser = name;
        document.getElementById('currentUserDisplay').innerHTML = 
            `👤 Welcome, <strong>${name}</strong>! You can now view and poll on events.`;
        document.getElementById('currentUserDisplay').style.display = 'block';
        nameInput.value = '';
        saveData(); // Save user data
        generateCalendar(); // Refresh calendar to show user-specific colors
    } else {
        alert('Please enter your name');
    }
}

// Toggle admin mode
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    const adminSection = document.getElementById('adminSection');
    adminSection.style.display = isAdminMode ? 'block' : 'none';
}

// Add event
async function addEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const description = document.getElementById('eventDescription').value.trim();
    
    if (!title || !date) {
        alert('Please enter event title and date');
        return;
    }
    
    const eventKey = date;
    if (!events[eventKey]) {
        events[eventKey] = [];
    }
    
    const newEvent = {
        id: Date.now(),
        title,
        date,
        time,
        description,
        polls: {}
    };
    
    events[eventKey].push(newEvent);
    
    // Clear form immediately
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDate').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventDescription').value = '';
    
    // Update calendar immediately with local data
    generateCalendar();
    generateUpcomingEvents();
    
    try {
        // Save to Google Sheets and wait for confirmation
        await saveEventToSheets(newEvent);
        console.log('Event saved successfully to Google Sheets');
        
        // Refresh from Google Sheets to get any updates from other users
        setTimeout(async () => {
            await loadEventsFromSheets();
            generateCalendar();
            generateUpcomingEvents();
        }, 2000);
        
    } catch (error) {
        console.error('Failed to save to Google Sheets:', error);
    }
    
    alert('Event added successfully!');
}

// Change month
function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateCalendarDisplay();
    generateCalendar();
    generateUpcomingEvents(); // Update upcoming events when month changes
}

// Update month display
function updateCalendarDisplay() {
    document.getElementById('monthDisplay').textContent = 
        `${months[currentMonth]} ${currentYear}`;
}

// Generate upcoming events list
function generateUpcomingEvents() {
    const eventsList = document.getElementById('eventsList');
    const today = new Date();
    const upcomingEvents = [];
    
    // Collect all events from today onwards
    for (const [dateStr, dayEvents] of Object.entries(events)) {
        const eventDate = new Date(dateStr);
        if (eventDate >= today) {
            dayEvents.forEach(event => {
                upcomingEvents.push({
                    ...event,
                    dateObj: eventDate,
                    dateStr: dateStr
                });
            });
        }
    }
    
    // Sort by date
    upcomingEvents.sort((a, b) => a.dateObj - b.dateObj);
    
    // Take only next 10 events
    const limitedEvents = upcomingEvents.slice(0, 10);
    
    if (limitedEvents.length === 0) {
        eventsList.innerHTML = '<div class="no-events">No upcoming events</div>';
        return;
    }
    
    eventsList.innerHTML = '';
    
    limitedEvents.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        
        // Determine status class
        if (currentUser) {
            const userPoll = event.polls[currentUser];
            if (userPoll) {
                eventItem.classList.add(userPoll.attending ? 'attending' : 'not-attending');
            } else {
                eventItem.classList.add('not-polled');
            }
        } else {
            eventItem.classList.add('no-user');
        }
        
        // Format date
        const dateFormatted = event.dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        eventItem.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-date">${dateFormatted}${event.time ? ` at ${event.time}` : ''}</div>
        `;
        
        // Make clickable to open event modal
        eventItem.onclick = () => openEventModal(event.dateStr);
        
        eventsList.appendChild(eventItem);
    });
}

// Generate calendar grid
function generateCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    // Add day headers
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        grid.appendChild(dayHeader);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = daysInPrevMonth - i;
        // No onclick for other month days
        grid.appendChild(dayDiv);
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;
        
        // Check if it's today
        if (dateStr === todayStr) {
            dayDiv.classList.add('today');
        }
        
        // Check for events and user polling status
        if (events[dateStr] && events[dateStr].length > 0) {
            dayDiv.classList.add('has-event');
            
            // ONLY add click event if there are events
            dayDiv.onclick = () => openEventModal(dateStr);
            dayDiv.style.cursor = 'pointer';
            
            if (currentUser) {
                // Check if user has polled on all events for this date
                const allEventsPolled = events[dateStr].every(event => 
                    event.polls[currentUser] !== undefined
                );
                
                if (allEventsPolled) {
                    // Check if user is attending any event on this date
                    const isAttendingAny = events[dateStr].some(event => 
                        event.polls[currentUser] && event.polls[currentUser].attending
                    );
                    
                    if (isAttendingAny) {
                        dayDiv.classList.add('polled-attending');
                    } else {
                        dayDiv.classList.add('polled-not-attending');
                    }
                } else {
                    dayDiv.classList.add('not-polled');
                }
            }
            
            // Add event indicator
            const indicator = document.createElement('div');
            indicator.className = 'event-indicator';
            dayDiv.appendChild(indicator);
        } else {
            // NO events - make it non-clickable
            dayDiv.style.cursor = 'default';
            // No onclick event added
        }
        
        grid.appendChild(dayDiv);
    }
    
    // Add next month's leading days
    const totalCells = 42; // 6 rows × 7 days
    const cellsUsed = firstDay + daysInMonth;
    for (let day = 1; cellsUsed + day - 1 < totalCells; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = day;
        // No onclick for other month days
        grid.appendChild(dayDiv);
    }
}

// Replace your generatePollResults function with this corrected version
function generatePollResults(event) {
    const polls = event.polls;
    const attendingUsers = [];
    const notAttendingUsers = [];
    
    for (const [userName, pollData] of Object.entries(polls)) {
        if (pollData.attending) {
            attendingUsers.push({
                name: userName,
                timestamp: pollData.timestamp
            });
        } else {
            notAttendingUsers.push({
                name: userName,
                timestamp: pollData.timestamp
            });
        }
    }
    
    // Sort by timestamp (most recent first)
    attendingUsers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    notAttendingUsers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Check current user's status
    const currentUserPoll = event.polls[currentUser];
    const userAttending = currentUserPoll ? currentUserPoll.attending : null;
    
    let resultsHTML = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">';
    
    // Attending column - CLICKABLE
    resultsHTML += `
        <div class="poll-option ${userAttending === true ? 'user-selected' : ''}" 
             onclick="pollEvent(${event.id}, true)" 
             style="background: #B2AB2B; padding: 12px; border-radius: 8px; border: 2px solid #402924; cursor: pointer; transition: all 0.2s ease;">
            <h5 style="color: #402924; margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
                <span>Can Attend (${attendingUsers.length})</span>
                ${userAttending === true ? '<span style="font-size: 12px;">← You</span>' : '<span style="font-size: 12px; opacity: 0.7;">Click to vote</span>'}
            </h5>
            ${attendingUsers.length > 0 ? 
                attendingUsers.map(user => `
                    <div style="margin-bottom: 6px;">
                        <span style="font-weight: 500; color: white; ${user.name === currentUser ? 'background: rgba(178, 171, 43, 0.2); padding: 2px 4px; border-radius: 3px;' : ''}">${user.name}</span>
                        <div style="font-size: 11px; color: white;">
                            ${new Date(user.timestamp).toLocaleDateString()} at ${new Date(user.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                `).join('') : 
                ''
            }
        </div>
    `;
    
    // Not attending column - CLICKABLE
    resultsHTML += `
        <div class="poll-option ${userAttending === false ? 'user-selected' : ''}" 
             onclick="pollEvent(${event.id}, false)" 
             style="background: #7C9DD2; padding: 12px; border-radius: 8px; border: 2px solid #402924; cursor: pointer; transition: all 0.2s ease;">
            <h5 style="color: #402924; margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
                <span>Can't Attend (${notAttendingUsers.length})</span>
                ${userAttending === false ? '<span style="font-size: 12px;">← You</span>' : '<span style="font-size: 12px; opacity: 0.7;">Click to vote</span>'}
            </h5>
            ${notAttendingUsers.length > 0 ? 
                notAttendingUsers.map(user => `
                    <div style="margin-bottom: 6px;">
                        <span style="font-weight: 500; color: white; ${user.name === currentUser ? 'background: rgba(124, 157, 210, 0.2); padding: 2px 4px; border-radius: 3px;' : ''}">${user.name}</span>
                        <div style="font-size: 11px; color: white;">
                            ${new Date(user.timestamp).toLocaleDateString()} at ${new Date(user.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                `).join('') : 
                ''
            }
        </div>
    `;
    
    resultsHTML += '</div>';
    
    // Add summary with proper yellow color
    const totalPolls = attendingUsers.length + notAttendingUsers.length;
    if (totalPolls > 0) {
        resultsHTML += `
            <div class="poll-summary" style="margin-top: 12px; text-align: center; font-size: 12px; color: #F4D68C !important;">
                Total responses: ${totalPolls} • ${attendingUsers.length} attending, ${notAttendingUsers.length} not attending
            </div>
        `;
    } else {
        resultsHTML += `
            <div class="poll-summary" style="margin-top: 12px; text-align: center; font-size: 12px; color: #F4D68C !important;">
                No votes yet - click on "Can Attend" or "Can't Attend" above to vote!
            </div>
        `;
    }
    
    return resultsHTML;
}

// Replace your openEventModal function with this corrected version
function openEventModal(dateStr) {
    if (!currentUser) {
        alert('Please enter your name first to view events');
        return;
    }
    
    console.log('Opening modal for date:', dateStr); // Debug log
    
    const dayEvents = events[dateStr] || [];
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('modalTitle');
    const eventDetails = document.getElementById('eventDetails');
    const pollingSection = document.getElementById('pollingSection');
    
    console.log('Events for this date:', dayEvents); // Debug log
    
    if (dayEvents.length === 0) {
        modalTitle.textContent = `No Events - ${new Date(dateStr).toDateString()}`;
        eventDetails.innerHTML = '<p style="color: #FAE3B0;">No events scheduled for this date.</p>';
        if (pollingSection) {
            pollingSection.style.display = 'none';
        }
        modal.style.display = 'block';
        return;
    }
    
    modalTitle.textContent = `Events - ${new Date(dateStr).toDateString()}`;
    
    let detailsHTML = '';
    
    dayEvents.forEach((event, index) => {
        console.log('Processing event:', event); // Debug log
        
        detailsHTML += `
            <div class="event-details">
                <h3 style="color: #F4D68C !important; margin-bottom: 12px; font-weight: 600; font-size: 1.125rem;">${event.title}</h3>
                ${event.time ? `<p style="color: #FAE3B0;"><strong>Time:</strong> ${event.time}</p>` : ''}
                ${event.description ? `<p style="color: #FAE3B0;"><strong>Description:</strong> ${event.description}</p>` : ''}
                
                <div class="poll-results" style="margin-top: 16px;">
                    <h4 style="color: #F4D68C !important; font-size: 1rem; margin-bottom: 12px;">Vote & See Results:</h4>
                    ${generatePollResults(event)}
                </div>
            </div>
            ${index < dayEvents.length - 1 ? '<hr style="margin: 20px 0; border-color: #FAE3B0;">' : ''}
        `;
    });
    
    console.log('Generated HTML:', detailsHTML); // Debug log
    
    eventDetails.innerHTML = detailsHTML;
    
    // Hide polling section if it exists
    if (pollingSection) {
        pollingSection.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

// Poll for event
async function pollEvent(eventId, attending) {
    if (!currentUser) {
        alert('Please enter your name first');
        return;
    }
    
    // Find the event
    let targetEvent = null;
    for (let dateKey in events) {
        targetEvent = events[dateKey].find(event => event.id === eventId);
        if (targetEvent) break;
    }
    
    if (targetEvent) {
        const timestamp = new Date().toISOString();
        targetEvent.polls[currentUser] = {
            attending: attending,
            timestamp: timestamp
        };
        
        // Update calendar immediately with local data
        generateCalendar();
        generateUpcomingEvents();
        
        // Update the modal content immediately if it's open
        const modalContent = document.querySelector('.modal-content');
        if (modalContent && document.getElementById('eventModal').style.display === 'block') {
            const modalTitle = document.getElementById('modalTitle').textContent;
            const dateMatch = modalTitle.match(/Events - (.+)/);
            if (dateMatch) {
                for (let dateKey in events) {
                    const dateObj = new Date(dateKey);
                    if (dateObj.toDateString() === dateMatch[1]) {
                        openEventModal(dateKey);
                        break;
                    }
                }
            }
        }
        
        // Save to Google Sheets in background
        await savePollToSheets(eventId, currentUser, attending, timestamp);
        
        // Refresh from Google Sheets after a delay to get updates from other users
        setTimeout(async () => {
            await loadEventsFromSheets();
            generateCalendar();
            generateUpcomingEvents();
            
            // Update modal again if still open
            if (modalContent && document.getElementById('eventModal').style.display === 'block') {
                const modalTitle = document.getElementById('modalTitle').textContent;
                const dateMatch = modalTitle.match(/Events - (.+)/);
                if (dateMatch) {
                    for (let dateKey in events) {
                        const dateObj = new Date(dateKey);
                        if (dateObj.toDateString() === dateMatch[1]) {
                            openEventModal(dateKey);
                            break;
                        }
                    }
                }
            }
        }, 3000);
    }
}

// Close modal
function closeModal() {
    document.getElementById('eventModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('eventModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// // Refresh data from Google Sheets
// async function refreshFromSheets() {
//     await loadEventsFromSheets();
//     generateCalendar();
//     generateUpcomingEvents(); // Update upcoming events list
//     alert('Data refreshed from Google Sheets!');
// }

// Clear all data (for admin use)
function clearAllData() {
    if (confirm('Are you sure you want to clear all events and user data? This cannot be undone.')) {
        localStorage.removeItem('oddsCalendar_events');
        localStorage.removeItem('oddsCalendar_currentUser');
        events = {};
        currentUser = null;
        document.getElementById('currentUserDisplay').style.display = 'none';
        generateCalendar();
        alert('All data cleared successfully!');
    }
}

// Initialize the calendar when page loads
document.addEventListener('DOMContentLoaded', checkExistingUser);

// Backup initialization in case DOMContentLoaded doesn't fire
window.addEventListener('load', function() {
    if (!document.getElementById('monthDisplay').textContent && !currentUser) {
        checkExistingUser();
    }
});

// Add this function to your JavaScript file
function closeAdminMode() {
    isAdminMode = false;
    const adminSection = document.getElementById('adminSection');
    adminSection.style.display = 'none';
}

// You can also update your existing toggleAdminMode function to be more explicit:
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    const adminSection = document.getElementById('adminSection');
    adminSection.style.display = isAdminMode ? 'block' : 'none';
}

