// ==UserScript==
// @name RSROC Event Details
// @namespace http://tampermonkey.net/
// @version 0.1
// @description Extract event details and display them on the calendar page
// @author Cline
// @match https://www.rsroc.org.tw/action/
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

            const rows = doc.querySelectorAll('.articleContent table tr');
            for (const row of rows) {
                const th = row.querySelector('th');
                if (th) {
                    if (th.innerText.includes('教育積點')) {
                        const td = row.querySelector('td');
                        if (td) educationPoints = td.innerText.trim();
                    }
                    if (th.innerText.includes('認定時數')) {
                        const td = row.querySelector('td');
                        if (td) recognizedHours = td.innerText.trim();
                    }
                }
            }
            return { educationPoints, recognizedHours };
        } catch (error) {
            console.error('Error fetching event details:', error);
            return { educationPoints: 'N/A', recognizedHours: 'N/A' };
        }
    }

    async function addEventDetailsToCalendar() {
        const eventLinks = document.querySelectorAll('.eventLink');

        for (const link of eventLinks) {
            const url = link.href;
            const eventDiv = link.querySelector('.event');
            const eventText = eventDiv.innerText;

            const details = await fetchEventDetails(url);

            if (details.educationPoints !== 'N/A' || details.recognizedHours !== 'N/A') {
                const moreInfoDiv = document.createElement('div');
                moreInfoDiv.classList.add('moreinfo');
                moreInfoDiv.style.fontSize = '0.8em';
                moreInfoDiv.style.color = 'gray';
                moreInfoDiv.innerHTML = `${details.educationPoints}, 時數: ${details.recognizedHours}`;
                eventDiv.appendChild(moreInfoDiv);
            }
        }
    }

    // Run the script after the page has loaded
    window.addEventListener('load', addEventDetailsToCalendar);

})();
