// Function to create the preview header with new tab button
export function createPreviewHeader() {
    const previewHeader = document.querySelector('.preview-header');
    
    // Add open in new tab button
    const newTabButton = document.createElement('a');
    newTabButton.id = 'open-new-tab';
    newTabButton.href = '#';
    newTabButton.target = '_blank';
    newTabButton.classList.add('preview-button');
    newTabButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
        </svg>
        Open in new tab
    `;
    
    // Check if controls div exists
    let controlsDiv = previewHeader.querySelector('.preview-controls');
    if (!controlsDiv) {
        controlsDiv = document.createElement('div');
        controlsDiv.className = 'preview-controls';
        previewHeader.appendChild(controlsDiv);
    }
    
    // Add the button to the controls
    controlsDiv.appendChild(newTabButton);
}