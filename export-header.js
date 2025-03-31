// Export view utility functions
export function setupExportView() {
    const copyCodeButtons = document.querySelectorAll('.copy-code');
    copyCodeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const codeElement = e.target.closest('.file-item').querySelector('code');
            if (codeElement) {
                copyToClipboard(codeElement.textContent);
                showCopyFeedback(e.target);
            }
        });
    });
}

// Copy text to clipboard
export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Code copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy code: ', err);
    });
}

// Show copy feedback by temporarily changing the button text
function showCopyFeedback(button) {
    const original = button.innerHTML;
    button.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
        </svg>
        Copied!
    `;
    setTimeout(() => {
        button.innerHTML = original;
    }, 2000);
}