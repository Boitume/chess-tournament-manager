// Run this in browser console to generate icons
(function generateAllIcons() {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    sizes.forEach(size => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        // Gradient border
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(1, '#00cc6a');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(2, size/50);
        ctx.strokeRect(2, 2, size-4, size-4);
        
        // Chess knight
        ctx.fillStyle = '#00ff88';
        ctx.font = `${size/2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♞', size/2, size/2);
        
        // Download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `icon-${size}x${size}.png`;
        link.href = dataUrl;
        link.click();
    });
    
    console.log('Icons generated! Place them in assets/icons/ folder');
})();