document.addEventListener("DOMContentLoaded", function(event) {
    GameConnector.init();
});

var GameConnector = {
    GAME_ENTRY_CODE: '1234',
    GAME_ID: "MAIN SYSTEM",

    init: function() {
        PusherManager.init();
        PusherManager.connectToChannel();
    },
};

var PusherManager = {
    CHANNEL_ID: "blockbuster",
    pusher: null,
    bIsHost: false,
    presenceChannel: null,
    sUserID: "",
    bIsConnected: false,
    emails: [],
    revealedEmailCount: 1,
    adMessages: [
        " CONGRATULATIONS! You've won a FREE car! Just send us your credit card details!",
        " Try Chairk Shampoo - Now with extra chair essence!",
        " Special Offer: Karate lessons at Jop's Wheelhouse Kick Studios - First kick is FREE!",
        " Download more RAM today! Make your computer 500% faster!",
        " Ronald Reinders wishes you a nice day!",
        " You are the 1,000,000th visitor! Claim your prize now!",
        " Scientists hate this one weird trick to debug code!",
        " AI is real!",
        " Make your Windows 95 run like Windows 98 with this simple trick!"
    ],

    init: function () {
        Pusher.logToConsole = true;

        this.pusher = new Pusher('34aeee625e438241557b', {
            cluster: 'eu',
            forceTLS: true,
            authEndpoint: 'https://interactionfigure.nl/nhl/blockbusterauth/pusher_auth.php'
        });

        this.notificationSound = document.getElementById('notification-sound');
        this.popupSound = document.getElementById('popup-sound');
        this.errorSound = document.getElementById('error-sound');
        this.inbox = document.getElementById('inbox');
        this.specialPopup = document.getElementById('special-popup');
        this.finalPopup = document.getElementById('final-popup');
        
        // Create error popup from template
        const errorTemplate = document.getElementById('error-popup-template');
        this.errorPopup = errorTemplate.content.firstElementChild.cloneNode(true);
        document.body.appendChild(this.errorPopup);
        
        // Add click handler to error popup close and OK button
        this.errorPopup.querySelector('.close').addEventListener('click', () => this.errorPopup.style.display = 'none');
        this.errorPopup.querySelector('button').addEventListener('click', () => this.errorPopup.style.display = 'none');

        // Add click handlers for window controls
        document.querySelectorAll('.window-controls span').forEach(control => {
            control.addEventListener('click', () => {
                this.errorSound.currentTime = 0;
                this.errorSound.play();
                this.errorPopup.style.display = 'block';
                this.errorPopup.style.position = 'absolute';
                this.errorPopup.style.top = '50%';
                this.errorPopup.style.left = '50%';
                this.errorPopup.style.transform = 'translate(-50%, -50%)';
                this.errorPopup.querySelector('.error-message').textContent = 'Operation not supported';
            });
        });
        
        this.setupDragHandlers();
        this.setupKeyboardHandlers();
        this.loadEmails();
        setTimeout(this.startRandomPopups.bind(this), 5000);
        
        document.querySelector('.compose-form').addEventListener('submit', this.sendEmail.bind(this));
    },

    connectToChannel: function () {
        this.presenceChannel = this.pusher.subscribe('presence-'+this.CHANNEL_ID);
        this.presenceChannel.bind('pusher:subscription_succeeded', this.onSubscriptionSucceeded.bind(this));
    },

    onSubscriptionSucceeded: function (_data) {
        this.sUserID = _data.myID+"";
        this.presenceChannel.bind('pusher:member_added', this.onMemberAdded.bind(this));
        this.presenceChannel.bind('pusher:member_removed', this.onMemberRemoved.bind(this));
        this.presenceChannel.bind('client-messagetochannel', this.onMessageFromOtherPlayer.bind(this));
    },

    onMemberAdded: function (_data) {
        console.log('onMemberAdded', _data);
    },

    onMemberRemoved: function (_data) {
        console.log('onMemberRemoved', _data);
    },

    sendMessageToChannel: function (_msg) {
        this.presenceChannel.trigger('client-messagetochannel', _msg);
    },

    onMessageFromOtherPlayer: function (_msg) {
        console.log('onMessageFromOtherPlayer', _msg);
        this.simulateNewEmail();
    },

    createRandomAdPopup: function() {
        const template = document.getElementById('ad-popup-template');
        const popup = template.content.cloneNode(true).children[0];
        
        this.popupSound.currentTime = 0;
        this.popupSound.play();
        
        const maxX = window.innerWidth - 300;
        const maxY = window.innerHeight - 200;
        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;
        
        popup.style.left = randomX + 'px';
        popup.style.top = randomY + 'px';
        
        const message = this.adMessages[Math.floor(Math.random() * this.adMessages.length)];
        popup.querySelector('.ad-message').textContent = message;
        
        popup.querySelector('.close').addEventListener('click', () => popup.remove());
        popup.querySelector('button').addEventListener('click', () => popup.remove());
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const dragStart = (e) => {
            if (e.target === popup.querySelector('.window-header') || e.target.parentNode === popup.querySelector('.window-header')) {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
                
                document.addEventListener("mousemove", drag);
                document.addEventListener("mouseup", dragEnd);
            }
        };
        
        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                
                popup.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        };
        
        const dragEnd = () => {
            isDragging = false;
            document.removeEventListener("mousemove", drag);
            document.removeEventListener("mouseup", dragEnd);
        };
        
        popup.addEventListener("mousedown", dragStart);
        document.body.appendChild(popup);
    },

    startRandomPopups: function() {
        const scheduleNextPopup = () => {
            const nextInterval = 10000 + Math.random() * 20000;
            setTimeout(() => {
                this.createRandomAdPopup();
                scheduleNextPopup();
            }, nextInterval);
        };
        scheduleNextPopup();
    },

    setupDragHandlers: function() {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let activePopup = null;

        const dragStart = (e) => {
            // Only start dragging if clicking on the header
            if (e.target.closest('.window-header')) {
                const popup = e.target.closest('.popup');
                if (popup) {
                    isDragging = true;
                    activePopup = popup;
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }
            }
        };
        
        const drag = (e) => {
            if (isDragging && activePopup) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                
                activePopup.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        };
        
        const dragEnd = () => {
            isDragging = false;
            activePopup = null;
        };

        // Add drag handlers to all popups
        const popups = [
            this.specialPopup,
            this.finalPopup,
            document.getElementById('email-detail-popup'),
            document.getElementById('compose-popup')
        ];

        popups.forEach(popup => {
            if (popup) {
                popup.style.position = 'absolute';
                popup.style.cursor = 'default';
                popup.addEventListener('mousedown', dragStart);
            }
        });

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    },

    setupKeyboardHandlers: function() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                document.getElementById('compose-popup').style.display = 'none';
                document.getElementById('email-detail-popup').style.display = 'none';
                this.specialPopup.style.display = 'none';
            }
        });
    },

    loadEmails: function() {
        fetch('data/emails.json')
            .then(response => response.json())
            .then(data => {
                this.emails = data.emails;
                this.renderEmails();
            });
    },

    renderEmails: function() {
        this.inbox.innerHTML = '';
        // Sort emails by ID (newest/highest ID first) and slice to revealed count
        const sortedEmails = [...this.emails]
            .sort((a, b) => a.id - b.id)
            .slice(0, this.revealedEmailCount);
            
        sortedEmails.forEach(email => {
            const emailElement = this.createEmailElement(email);
            this.inbox.appendChild(emailElement);
        });
    },

    createEmailElement: function(email) {
        const emailElement = document.createElement('div');
        emailElement.className = `email-item ${email.unread ? 'unread' : ''}`;
        emailElement.innerHTML = `
            <div class="email-sender">${email.sender}</div>
            <div class="email-subject">${email.subject}</div>
            <div class="email-date">${this.formatRelativeTime(email.date)}</div>
        `;
        emailElement.addEventListener('click', (event) => this.showEmailDetail(email, event));
        return emailElement;
    },

    formatRelativeTime: function(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return `${diffInSeconds} seconds ago`;
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
        }
        
        // Fall back to actual date for older messages
        return date.toLocaleDateString();
    },

    showEmailDetail: function(email, event) {
        document.getElementById('detail-sender').textContent = email.sender;
        document.getElementById('detail-subject').textContent = email.subject;
        document.getElementById('detail-date').textContent = this.formatRelativeTime(email.date);
        document.getElementById('detail-content').textContent = email.content;
        document.getElementById('email-detail-popup').style.display = 'block';

        if (email.unread) {
            email.unread = false;
            const emailElement = event.currentTarget;
            emailElement.classList.remove('unread');
        }
    },

    sendEmail: function(event) {
        event.preventDefault();
        const form = event.target;
        const to = form.querySelector('input[placeholder="To:"]').value;
        const subject = form.querySelector('input[placeholder="Subject:"]').value;
        const message = form.querySelector('textarea').value;

        const wooshSound = document.getElementById('woosh-sound');
        const errorSound = document.getElementById('error-sound');

        const recipient = to.toLowerCase();
        const emailSubject = subject.toLowerCase();
        
        switch(true) {
            case recipient === 'tjerk.dijkstra@nhlstenden.com':
                this.specialPopup.style.display = 'block';
                this.specialPopup.style.position = 'absolute';
                this.specialPopup.style.top = '50%';
                this.specialPopup.style.left = '50%';
                this.specialPopup.style.transform = 'translate(-50%, -50%)';
                wooshSound.currentTime = 0;
                wooshSound.play();
                break;
                
            case recipient === 'admin@blockbuster.com' && emailSubject === 'rosebud':
                this.finalPopup.style.display = 'block';
                this.finalPopup.style.position = 'absolute';
                this.finalPopup.style.top = '50%';
                this.finalPopup.style.left = '50%';
                this.finalPopup.style.transform = 'translate(-50%, -50%)';
                this.finalPopup.style.height = '1150px';
                this.finalPopup.style.width = '1150px';
                wooshSound.currentTime = 0;
                wooshSound.play();
        
                this.finalPopup.style.transform = 'translate(-50%, -50%)';
                break;
                
            default:
                // Show the error popup with message
                this.errorPopup.style.display = 'block';
                this.errorPopup.style.position = 'absolute';
                this.errorPopup.style.top = '50%';
                this.errorPopup.style.left = '50%';
                this.errorPopup.style.transform = 'translate(-50%, -50%)';
                this.errorPopup.querySelector('.error-message').textContent = 'No email sent';
                errorSound.currentTime = 0;
                errorSound.play();
                break;
        }
        
        form.reset();
        document.getElementById('compose-popup').style.display = 'none';
    },

    simulateNewEmail: function() {
        if (this.revealedEmailCount < this.emails.length) {
            this.revealedEmailCount++;
            this.renderEmails();
            this.notificationSound.currentTime = 0;
            this.notificationSound.play();
        }
    }
};
