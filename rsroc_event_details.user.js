// ==UserScript==
// @name RSROC Event Details
// @namespace http://tampermonkey.net/
// @version 0.1
// @description Extract event details and display them on the calendar page
// @author Cline
// @match https://www.rsroc.org.tw/action/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    async function fetchEventDetails(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let educationPoints = '';
            let recognizedHours = '';
            let eventDateTime = '';
            let eventLocation = '';
            let eventTitle = '';
            let eventContent = '';
            let contactInfo = '';

            const rows = doc.querySelectorAll('.articleContent table tr');
            for (const row of rows) {
                const th = row.querySelector('th');
                if (th) {
                    if (th.innerText.includes('活動日期')) {
                        const td = row.querySelector('td');
                        if (td) eventDateTime = td.innerText.trim();
                    }
                     if (th.innerText.includes('主辦單位')) {
                         // Extract event title from caption
                         const caption = doc.querySelector('.tableContent caption');
                         if (caption) eventTitle = caption.innerText.trim();
                    }
                    if (th.innerText.includes('活動地點')) {
                        const td = row.querySelector('td');
                        if (td) eventLocation = td.innerText.trim();
                    }
                     if (th.innerText.includes('活動內容')) {
                        const td = row.querySelector('td');
                        if (td) eventContent = td.innerText.trim();
                    }
                    if (th.innerText.includes('教育積點')) {
                        const td = row.querySelector('td');
                        if (td) educationPoints = td.innerText.replace('放射診斷科專科醫師', '').trim();
                    }
                    if (th.innerText.includes('認定時數')) {
                        const td = row.querySelector('td');
                        if (td) recognizedHours = td.innerText.trim();
                    }
                     if (th.innerText.includes('聯絡資訊')) {
                        const td = row.querySelector('td');
                        if (td) contactInfo = td.innerText.trim();
                    }
                }
            }
            return { educationPoints, recognizedHours, eventDateTime, eventLocation, eventTitle, eventContent, contactInfo };
        } catch (error) {
            console.error('Error fetching event details:', error);
            return { educationPoints: 'N/A', recognizedHours: 'N/A', eventDateTime: '', eventLocation: '', eventTitle: 'Event', eventContent: '', contactInfo: '' };
        }
    }

    function formatGoogleCalendarDate(dateTimeString) {
        // Expected format: YYYY/MM/DD　星期X　HH:MM ~ HH:MM
        const parts = dateTimeString.match(/(\d{4})\/(\d{2})\/(\d{2}).*?(\d{2}):(\d{2})\s*~*\s*(\d{0,2})*:*(\d{0,2})/);
        if (!parts) return null;

        const year = parts[1];
        const month = parts[2];
        const day = parts[3];
        const startHour = parts[4];
        const startMinute = parts[5];
        const endHour = parts[6] || startHour; // Assume same hour if end hour is missing
        const endMinute = parts[7] || startMinute; // Assume same minute if end minute is missing


        // Google Calendar format: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
        const start = `${year}${month}${day}T${startHour}${startMinute}00`;
        const end = `${year}${month}${day}T${endHour}${endMinute}00`;


        return `${start}/${end}`;
    }


    async function addEventDetailsToCalendar() {
        const eventLinks = document.querySelectorAll('.eventLink');

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: absolute;
            background-color: #fff;
            border: 1px solid #ccc;
            padding: 10px;
            z-index: 1000;
            display: none;
            font-size: 0.9em;
            color: #333;
            max-width: 300px;
            word-wrap: break-word;
            pointer-events: none; /* Allow clicks to pass through */
        `;
        document.body.appendChild(tooltip);


        for (const link of eventLinks) {
            const url = link.href;
            const eventDiv = link.querySelector('.event');
            const eventText = eventDiv.innerText;

            const details = await fetchEventDetails(url);

            // Store details on the eventDiv
            eventDiv.dataset.eventContent = details.eventContent;
            eventDiv.dataset.contactInfo = details.contactInfo;
            eventDiv.dataset.eventTitle = details.eventTitle;
            eventDiv.dataset.eventDateTime = details.eventDateTime;
            eventDiv.dataset.eventLocation = details.eventLocation;


            if (details.educationPoints !== 'N/A' || details.recognizedHours !== 'N/A' || details.eventDateTime) {
                const moreInfoDiv = document.createElement('div');
                moreInfoDiv.classList.add('moreinfo');
                moreInfoDiv.style.fontSize = '0.8em';
                moreInfoDiv.style.color = 'gray';
                moreInfoDiv.innerText = `積點: ${details.educationPoints}, 時數: ${details.recognizedHours}`;

                if (details.eventDateTime) {
                    const googleCalendarDate = formatGoogleCalendarDate(details.eventDateTime);
                    if (googleCalendarDate) {
                        const googleCalendarLink = document.createElement('a');
                        const calendarDetails = `活動內容: ${details.eventContent}\n\n聯絡資訊: ${details.contactInfo}\n\n原始連結: ${url}`;
                        googleCalendarLink.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(details.eventTitle)}&dates=${googleCalendarDate}&details=${encodeURIComponent(calendarDetails)}&location=${encodeURIComponent(details.eventLocation)}`;
                        googleCalendarLink.target = '_blank';
                        googleCalendarLink.innerText = '📅'; // Calendar emoji
                        googleCalendarLink.style.marginLeft = '5px';
                        moreInfoDiv.appendChild(googleCalendarLink);
                    }
                }

                eventDiv.appendChild(moreInfoDiv);
            }

            // Add hover event listeners
            eventDiv.addEventListener('mouseover', (event) => {
                const content = event.target.dataset.eventContent || '無活動內容';
                const contact = event.target.dataset.contactInfo || '無聯絡資訊';
                tooltip.innerHTML = `<strong>活動內容:</strong><br>${content}<br><br><strong>聯絡資訊:</strong><br>${contact}`;

                // Position the tooltip
                const rect = event.target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + window.scrollX}px`;
                tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`; // 5px below the element
                tooltip.style.display = 'block';
            });

            eventDiv.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
        }
    }

    // Run the script after the page has loaded
    window.addEventListener('load', addEventDetailsToCalendar);

})();
