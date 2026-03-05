// This will create placeholder icons to avoid 404 errors
(function createPlaceholderIcons() {
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    iconSizes.forEach(size => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        // Draw green border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = Math.max(2, size/50);
        ctx.strokeRect(2, 2, size-4, size-4);
        
        // Draw chess knight symbol
        ctx.fillStyle = '#00ff88';
        ctx.font = `${size/2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♞', size/2, size/2);
        
        // Convert to data URL and create link
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a link element for each icon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.sizes = `${size}x${size}`;
        link.href = dataUrl;
        document.head.appendChild(link);
    });
    
    console.log('Placeholder icons created');
})();