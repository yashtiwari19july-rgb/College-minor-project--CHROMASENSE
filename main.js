// Main application logic
let selectedGender = null;
let selectedAgeGroup = null;
let stream = null;
let capturedImage = null;
let facialHairConfirmed = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // Initialize event listeners
    initializeEventListeners();
});

function initializeEventListeners() {
    // Gender selection
    const genderButtons = document.querySelectorAll('.gender-btn');
    const ageSection = document.getElementById('ageSection');
    const ageButtons = document.querySelectorAll('.age-btn');

    genderButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            genderButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedGender = this.dataset.gender;
            selectedAgeGroup = null;
            facialHairConfirmed = false;

            // Reset age buttons and show age section
            ageButtons.forEach(b => b.classList.remove('active'));
            ageSection.style.display = 'block';
            document.getElementById('cameraSection').style.display = 'none';
        });
    });

    // Age selection
    ageButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            ageButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedAgeGroup = this.dataset.age;
            document.getElementById('cameraSection').style.display = 'block';
        });
    });

    // Camera controls
    document.getElementById('startCameraBtn').addEventListener('click', startCamera);
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('retakeBtn').addEventListener('click', retakePhoto);
    document.getElementById('analyzeBtn').addEventListener('click', analyzePhoto);
    document.getElementById('newAnalysisBtn').addEventListener('click', resetAnalysis);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function startCamera() {
    const video = document.getElementById('video');
    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const preview = document.getElementById('preview');
    const canvas = document.getElementById('canvas');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(function(mediaStream) {
            stream = mediaStream;
            video.srcObject = mediaStream;
            video.style.display = 'block';
            preview.style.display = 'none';
            startBtn.style.display = 'none';
            captureBtn.style.display = 'inline-block';
        })
        .catch(function(err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please check permissions.');
        });
}

async function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('preview');
    const previewImage = document.getElementById('previewImage');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Stop camera stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    capturedImage = canvas.toDataURL('image/png');
    previewImage.src = capturedImage;

    video.style.display = 'none';
    preview.style.display = 'block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';
    analyzeBtn.style.display = 'inline-block';

    // If female is selected, immediately confirm when facial hair is detected
    if (selectedGender === 'female') {
        const proceed = await confirmFemaleSelectionIfFacialHair(capturedImage);
        if (!proceed) {
            return;
        }
    }
}

function retakePhoto() {
    const video = document.getElementById('video');
    const preview = document.getElementById('preview');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const startBtn = document.getElementById('startCameraBtn');

    preview.style.display = 'none';
    retakeBtn.style.display = 'none';
    analyzeBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
    capturedImage = null;
    facialHairConfirmed = false;
    
    startCamera();
}

async function analyzePhoto() {
    if (!selectedGender) {
        alert('Please select your gender.');
        return;
    }

    if (!selectedAgeGroup) {
        alert('Please select your age group.');
        return;
    }

    if (!capturedImage) {
        alert('Please capture a photo first!');
        return;
    }

    if (selectedGender === 'female' && !facialHairConfirmed) {
        const proceed = await confirmFemaleSelectionIfFacialHair(capturedImage);
        if (!proceed) {
            return;
        }
    }

    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Analyze skin tone
        const skinTone = detectSkinTone(ctx, canvas.width, canvas.height);
        const recommendations = getFashionRecommendations(skinTone, selectedGender, selectedAgeGroup);

        // Display results
        displayResults(skinTone, recommendations);
    };
    img.src = capturedImage;
}

// Very rough heuristic to detect presence of beard / moustache
function detectFacialHair(ctx, width, height) {
    // Focus on lower-central region of the face (where beard/moustache usually appear)
    const startX = Math.floor(width * 0.35);
    const endX = Math.floor(width * 0.65);
    const startY = Math.floor(height * 0.55);
    const endY = Math.floor(height * 0.85);

    let darkPixelCount = 0;
    let totalSampled = 0;
    const sampleSize = 400;

    for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor(Math.random() * (endX - startX) + startX);
        const y = Math.floor(Math.random() * (endY - startY) + startY);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        const brightness = (r + g + b) / 3;

        // Count significantly dark pixels as potential facial hair
        if (brightness < 70 && r < 90 && g < 90 && b < 90) {
            darkPixelCount++;
        }
        totalSampled++;
    }

    // If enough dark pixels are present in this region, assume some facial hair
    const darkRatio = darkPixelCount / Math.max(totalSampled, 1);
    return darkRatio > 0.18; // threshold tuned experimentally
}

// Ask for confirmation when female is selected but facial hair is detected
function confirmFemaleSelectionIfFacialHair(imageData) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const hasFacialHair = detectFacialHair(ctx, canvas.width, canvas.height);
            if (hasFacialHair) {
                const message = 'We detected beard or moustache-like features on the face. You selected gender as "female".\n\nClick OK to continue with this gender, or Cancel to go back and change it.';
                const confirmed = window.confirm(message);
                if (confirmed) {
                    facialHairConfirmed = true;
                    resolve(true);
                } else {
                    resetAnalysis();
                    resolve(false);
                }
            } else {
                facialHairConfirmed = true;
                resolve(true);
            }
        };
        img.onerror = () => resolve(true);
        img.src = imageData;
    });
}

function detectSkinTone(ctx, width, height) {
    // Sample pixels from face region (center area, assuming face is in center)
    const sampleSize = 100;
    const startX = Math.floor(width * 0.3);
    const startY = Math.floor(height * 0.2);
    const endX = Math.floor(width * 0.7);
    const endY = Math.floor(height * 0.6);

    let rSum = 0, gSum = 0, bSum = 0;
    let count = 0;

    // Sample random pixels from the face region
    for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor(Math.random() * (endX - startX) + startX);
        const y = Math.floor(Math.random() * (endY - startY) + startY);
        
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        // Filter for skin-like colors (heuristic)
        if (r > 95 && g > 40 && b > 20 && 
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 && r > g && r > b) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
        }
    }

    if (count === 0) {
        // Fallback: use average of center region
        for (let i = 0; i < sampleSize; i++) {
            const x = Math.floor(Math.random() * (endX - startX) + startX);
            const y = Math.floor(Math.random() * (endY - startY) + startY);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            rSum += pixel[0];
            gSum += pixel[1];
            bSum += pixel[2];
            count++;
        }
    }

    const avgR = Math.floor(rSum / count);
    const avgG = Math.floor(gSum / count);
    const avgB = Math.floor(bSum / count);

    // Classify skin tone based on RGB values
    return classifySkinTone(avgR, avgG, avgB);
}

function classifySkinTone(r, g, b) {
    // Calculate brightness and undertone
    const brightness = (r + g + b) / 3;
    const undertone = r - b; // Positive = warm, negative = cool

    if (brightness < 100) {
        return { type: 'Deep', description: 'Deep skin tone with rich, dark complexion', rgb: [r, g, b] };
    } else if (brightness < 140) {
        if (undertone > 20) {
            return { type: 'Medium-Warm', description: 'Medium skin tone with warm golden undertones', rgb: [r, g, b] };
        } else {
            return { type: 'Medium-Cool', description: 'Medium skin tone with cool olive undertones', rgb: [r, g, b] };
        }
    } else if (brightness < 180) {
        if (undertone > 15) {
            return { type: 'Light-Warm', description: 'Light skin tone with warm peachy undertones', rgb: [r, g, b] };
        } else {
            return { type: 'Light-Cool', description: 'Light skin tone with cool pink undertones', rgb: [r, g, b] };
        }
    } else {
        return { type: 'Fair', description: 'Fair skin tone with light complexion', rgb: [r, g, b] };
    }
}

function getFashionRecommendations(skinTone, gender, ageGroup) {
    const recommendations = {
        colors: [],
        tips: []
    };

    const toneType = skinTone.type;

    // Color recommendations based on skin tone
    if (toneType.includes('Deep')) {
        recommendations.colors = [
            { name: 'Royal Blue', hex: '#4169E1' },
            { name: 'Emerald Green', hex: '#50C878' },
            { name: 'Crimson Red', hex: '#DC143C' },
            { name: 'Purple', hex: '#800080' },
            { name: 'Gold', hex: '#FFD700' },
            { name: 'Ivory', hex: '#FFFFF0' }
        ];
        recommendations.tips = [
            'Bold, vibrant colors look stunning on deep skin tones',
            'Rich jewel tones like emerald, sapphire, and ruby are perfect',
            'Avoid pastels and very light colors that may wash you out',
            'Metallic colors like gold and bronze complement beautifully',
            'High contrast colors create a striking appearance'
        ];
    } else if (toneType.includes('Medium-Warm')) {
        recommendations.colors = [
            { name: 'Coral', hex: '#FF7F50' },
            { name: 'Turquoise', hex: '#40E0D0' },
            { name: 'Olive Green', hex: '#808000' },
            { name: 'Burnt Orange', hex: '#CC5500' },
            { name: 'Teal', hex: '#008080' },
            { name: 'Warm Brown', hex: '#8B4513' }
        ];
        recommendations.tips = [
            'Warm earth tones enhance your golden undertones',
            'Coral and peach shades bring out your natural warmth',
            'Olive and teal create a harmonious look',
            'Avoid cool blues and purples that may clash',
            'Autumn color palette works beautifully'
        ];
    } else if (toneType.includes('Medium-Cool')) {
        recommendations.colors = [
            { name: 'Navy Blue', hex: '#000080' },
            { name: 'Forest Green', hex: '#228B22' },
            { name: 'Burgundy', hex: '#800020' },
            { name: 'Slate Gray', hex: '#708090' },
            { name: 'Plum', hex: '#8B008B' },
            { name: 'Charcoal', hex: '#36454F' }
        ];
        recommendations.tips = [
            'Cool, muted tones complement your olive undertones',
            'Deep blues and greens are your best friends',
            'Jewel tones work well but avoid bright warm colors',
            'Neutral colors like gray and charcoal are versatile',
            'Winter color palette suits you perfectly'
        ];
    } else if (toneType.includes('Light-Warm')) {
        recommendations.colors = [
            { name: 'Peach', hex: '#FFCBA4' },
            { name: 'Sage Green', hex: '#9CAF88' },
            { name: 'Dusty Rose', hex: '#B76E79' },
            { name: 'Cream', hex: '#FFFDD0' },
            { name: 'Terracotta', hex: '#E2725B' },
            { name: 'Warm Beige', hex: '#F5F5DC' }
        ];
        recommendations.tips = [
            'Soft, warm pastels enhance your peachy undertones',
            'Earthy tones like terracotta and sage are flattering',
            'Avoid harsh, bright colors that may overpower',
            'Spring color palette works beautifully',
            'Cream and beige create an elegant, natural look'
        ];
    } else if (toneType.includes('Light-Cool')) {
        recommendations.colors = [
            { name: 'Powder Blue', hex: '#B0E0E6' },
            { name: 'Lavender', hex: '#E6E6FA' },
            { name: 'Mint Green', hex: '#98FF98' },
            { name: 'Rose Pink', hex: '#FFB6C1' },
            { name: 'Silver Gray', hex: '#C0C0C0' },
            { name: 'Soft Lilac', hex: '#DDA0DD' }
        ];
        recommendations.tips = [
            'Cool pastels complement your pink undertones',
            'Soft blues and lavenders are perfect choices',
            'Avoid warm oranges and yellows',
            'Summer color palette suits you best',
            'Light, airy colors create a fresh appearance'
        ];
    } else { // Fair
        recommendations.colors = [
            { name: 'Pastel Blue', hex: '#ADD8E6' },
            { name: 'Soft Pink', hex: '#FFC0CB' },
            { name: 'Lavender', hex: '#E6E6FA' },
            { name: 'Mint', hex: '#F0FFF0' },
            { name: 'Peach', hex: '#FFCBA4' },
            { name: 'Cream', hex: '#FFFDD0' }
        ];
        recommendations.tips = [
            'Light, soft colors work beautifully',
            'Pastels create a delicate, elegant look',
            'Avoid very dark colors that may create too much contrast',
            'Both warm and cool pastels can work',
            'Focus on light to medium color intensity'
        ];
    }

    // Gender-specific outfit suggestions using the recommended colors
    const c1 = recommendations.colors[0]?.name || 'these shades';
    const c2 = recommendations.colors[1]?.name || 'similar tones';
    const c3 = recommendations.colors[2]?.name || 'complementary colors';

    if (gender === 'male') {
        recommendations.tips.push(
            'Shirts: Try formal or casual shirts in ' + c1 + ' or ' + c2 + ' to highlight your skin tone.'
        );
        recommendations.tips.push(
            'Pants: Pair them with trousers or chinos in deeper neutrals like charcoal, navy, or classic black for balance.'
        );
        recommendations.tips.push(
            'Blazer & Suit: Choose blazers and suits that pick one of your key colors (' + c1 + ' / ' + c2 + ') or stay in rich neutrals like navy and deep gray.'
        );
        recommendations.tips.push(
            'Shoes: Go for leather shoes in brown, tan, or black; match the depth of the shoe color with the formality of your outfit.'
        );
        recommendations.tips.push(
            'Ties & Accessories: Use brighter shades like ' + c3 + ' in ties, pocket squares, and watches to add a stylish highlight.'
        );
    } else if (gender === 'female') {
        recommendations.tips.push(
            'Lehenga: You should wear lehenga in shades like ' + c1 + ' or ' + c2 + ' to make your complexion glow.'
        );
        recommendations.tips.push(
            'Suit / Salwar: Choose suit–salwar sets with a main color in ' + c1 + ' or ' + c3 + ' and lighter dupatta or embroidery for contrast.'
        );
        recommendations.tips.push(
            'Saree: Sarees in ' + c2 + ' or similar rich tones with a slightly darker or lighter blouse will frame your face beautifully.'
        );
        recommendations.tips.push(
            'Jeans & Tops: Combine classic blue or black jeans with tops and kurtis in ' + c1 + ' / ' + c2 + ' for everyday wear.'
        );
        recommendations.tips.push(
            'Dresses & Gowns: Party dresses and gowns in ' + c3 + ' or neighboring shades from your palette will look elegant and photo‑ready.'
        );
    }

    // Age-group-specific tips (including dedicated child section)
    if (ageGroup === 'child') {
        recommendations.tips.push('For children, focus on comfortable fabrics and playful patterns in these colors.');
        recommendations.tips.push('Use these shades in school outfits, T‑shirts, and casual wear.');
    } else if (ageGroup === 'teen') {
        recommendations.tips.push('Teens can mix these colors with denim and sneakers for a trendy look.');
        recommendations.tips.push('Experiment with hoodies, graphic tees, and layered outfits in these shades.');
    } else if (ageGroup === 'adult') {
        recommendations.tips.push('Adults can use these colors in office wear, casual looks, and occasion outfits.');
        recommendations.tips.push('Combine these shades with neutral basics for a balanced wardrobe.');
    }

    return recommendations;
}

function displayResults(skinTone, recommendations) {
    document.getElementById('skinTone').textContent = skinTone.type;
    document.getElementById('toneDescription').textContent = skinTone.description;

    // Display color palette
    const paletteContainer = document.getElementById('colorPalette');
    paletteContainer.innerHTML = '';
    recommendations.colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color.hex;
        swatch.textContent = color.name;
        paletteContainer.appendChild(swatch);
    });

    // Display fashion tips
    const tipsContainer = document.getElementById('fashionTips');
    tipsContainer.innerHTML = '';
    recommendations.tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        tipsContainer.appendChild(li);
    });

    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('cameraSection').scrollIntoView({ behavior: 'smooth' });
}

function resetAnalysis() {
    selectedGender = null;
    selectedAgeGroup = null;
    capturedImage = null;
    facialHairConfirmed = false;
    
    // Reset UI
    document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.age-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('ageSection').style.display = 'none';
    document.getElementById('cameraSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('preview').style.display = 'none';
    document.getElementById('video').style.display = 'none';
    document.getElementById('startCameraBtn').style.display = 'inline-block';
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('analyzeBtn').style.display = 'none';
    
    // Stop any active camera stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

