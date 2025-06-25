const GLOBAL_VARIABLES = {
    cocossd_model: null,
    allImagePredictions: [],
    detected_objects: [],
    isDetectionOngoing: false,
    userOptions: {
        acceptableConfidenceScore: {
            currentValue: 0.7,
            map: {
                "50": 0.5,
                "60": 0.6, 
                "70": 0.7,
                "80": 0.8,
                "90": 0.9,
            }
        },
        resultFontColor: {
            currentValue: 'light',
            map: {
                "light": {
                    text: `#ddd`,
                    border: `#ddda`
                },
                "dark": {
                    text: `#111`,
                    border: `#111a`
                }
            }
        },
        toggles: {
            // Toggles do not need to be mapped !
            hideResultBoxes: {
                currentValue: false,
            }
        }
    },

};

// Add event listeners
const fontColorRadios = document.querySelectorAll('input[type=radio][name="fontcolor"]');
fontColorRadios.forEach(radio => radio.addEventListener('change', () => handleFontColorChange(radio.value)));

const acceptableConfidenceScoreRadios = document.querySelectorAll('input[type=radio][name="confidence_score"]');
acceptableConfidenceScoreRadios.forEach(radio => {radio.addEventListener('change', () => handleAcceptableConfidenceScoreChange(radio.value));}); 

const hideBoxesCheckbox = document.getElementById('hideBoxesCheckbox');
hideBoxesCheckbox.addEventListener('change', () => handleHideBoxesToggle(hideBoxesCheckbox.checked));

cocoSsd.load().then(model => {
    GLOBAL_VARIABLES.cocossd_model = model;

    // Remove layer that prevents from clicking the input
    const uploadMask = document.getElementById('upload-mask');
    uploadMask.classList.remove('inactive-switch');

    // Add event listener to the "Choose file" label
    const uploadInput = document.getElementById('uploadInput');

    uploadInput.addEventListener('input', function(event) {
        const resultImage = document.getElementById('resultImage');
        const url = URL.createObjectURL(uploadInput.files[0]);
        resultImage.src = url;

        updateDetectionStatus('none');
        cleanpreviousResults();
        cleanImagePredictions();
        triggerHideBoxesCheckboxVisualUpdate(false);
        removeDetectButtonLayer();
    });

    // Add event listener to the "Detect" button
    const detectButton = document.getElementById('detectButton');
    const resultImage = document.getElementById('resultImage');


    detectButton.addEventListener('click', function() {
        if(GLOBAL_VARIABLES.isDetectionOngoing) return;
        if(GLOBAL_VARIABLES.allImagePredictions.length) return; // That indicates that the detection has been performed already

        GLOBAL_VARIABLES.cocossd_model.detect(resultImage).then(predictions => { 
            GLOBAL_VARIABLES.allImagePredictions.push(...predictions);
            handleDetectionProcess(predictions) 
        });
    });


});

function handleDetectionProcess(predictions) {

    updateDetectionStatus('loading');

    cleanpreviousResults();

    const resultWrapper = document.getElementById('result-wrapper');

    const confidentObjectsFound = predictions.filter(obj => obj.score > GLOBAL_VARIABLES.userOptions.acceptableConfidenceScore.currentValue);

    for(let n = 0; n < confidentObjectsFound.length; n++) {
        const p = document.createElement('p');
        p.setAttribute('class', 'prediction-text');
        p.innerText = `${predictions[n].class} - (${Math.round(parseFloat(predictions[n].score) * 100)}%)`;
        p.style = `color: ${GLOBAL_VARIABLES.userOptions.resultFontColor.map[GLOBAL_VARIABLES.userOptions.resultFontColor.currentValue].text}; margin-left: ${predictions[n].bbox[0] + 10}px; margin-top: ${predictions[n].bbox[1] + 10}px; width: ${predictions[n].bbox[2] - 10}px; top: 0; left: 0;`;

        const highlight = document.createElement('div');
        highlight.setAttribute('class', 'highlight');
        highlight.style = `background-color: hsla(${120 + (360 / confidentObjectsFound.length) * n}, 100%, 50%, 0.25); border: 2px dashed ${GLOBAL_VARIABLES.userOptions.resultFontColor.map[GLOBAL_VARIABLES.userOptions.resultFontColor.currentValue].border}; left: ${predictions[n].bbox[0]}px; top: ${predictions[n].bbox[1]}px; width: ${predictions[n].bbox[2]}px; height: ${predictions[n].bbox[3]}px;`;

        resultWrapper.appendChild(highlight);
        resultWrapper.appendChild(p);
        GLOBAL_VARIABLES.detected_objects.push(highlight);
        GLOBAL_VARIABLES.detected_objects.push(p);
    }

    if(GLOBAL_VARIABLES.userOptions.toggles.hideResultBoxes.currentValue === true) { 
        handleHideBoxesToggle(true);
    }; 

    updateDetectionStatus('finished', confidentObjectsFound.length);
}

function updateDetectionStatus(status, confidentObjectsFound) {
    if(!status) return;
    
    const detectionStatusEl = document.getElementById('detection-status');
    
    if(status === 'none') {
        GLOBAL_VARIABLES.isDetectionOngoing = false;
        detectionStatusEl.innerText = '';
        detectionStatusEl.style.color = 'goldenrod';
    }
    else if(status === 'loading') {
        GLOBAL_VARIABLES.isDetectionOngoing = true;
        detectionStatusEl.innerText = '⚠️ Detecting...';
        detectionStatusEl.style.color = 'goldenrod';
    } else if(status === 'finished') {
        GLOBAL_VARIABLES.isDetectionOngoing = false;
        if(!confidentObjectsFound) {
            detectionStatusEl.innerText = '❌ No objects found';
            detectionStatusEl.style.color = 'indianred';
        } else {
            detectionStatusEl.innerText = `✅ ${confidentObjectsFound} objects detected`;
            detectionStatusEl.style.color = 'lightgreen';
        }
    
    }
}

function cleanpreviousResults() {
    const resultWrapper = document.getElementById('result-wrapper');
    for(let i=0; i <GLOBAL_VARIABLES.detected_objects.length; i++) {
        resultWrapper.removeChild(GLOBAL_VARIABLES.detected_objects[i]);
    }
    GLOBAL_VARIABLES.detected_objects.splice(0);
}

function cleanImagePredictions() {
    GLOBAL_VARIABLES.allImagePredictions.splice(0);
}

function removeDetectButtonLayer() {
    const detectMask = document.getElementById('detect-mask');
    detectMask.classList.remove('inactive-switch');
}

// Event listners for option buttons

function handleFontColorChange(colorTheme) {
    GLOBAL_VARIABLES.userOptions.resultFontColor.currentValue = colorTheme || GLOBAL_VARIABLES.userOptions.resultFontColor.currentValue;
    if(!GLOBAL_VARIABLES.detected_objects.length) return;

    GLOBAL_VARIABLES.detected_objects.forEach(obj => {
        if(obj.tagName === 'P') {
            obj.style.color = GLOBAL_VARIABLES.userOptions.resultFontColor.map[GLOBAL_VARIABLES.userOptions.resultFontColor.currentValue].text;
        } else if(obj.tagName === 'DIV') {
            obj.style.borderColor = GLOBAL_VARIABLES.userOptions.resultFontColor.map[GLOBAL_VARIABLES.userOptions.resultFontColor.currentValue].border;
        }
    });
}

function handleAcceptableConfidenceScoreChange(confidence_score) {
    GLOBAL_VARIABLES.userOptions.acceptableConfidenceScore.currentValue = GLOBAL_VARIABLES.userOptions.acceptableConfidenceScore.map[confidence_score] || GLOBAL_VARIABLES.userOptions.acceptableConfidenceScore.currentValue;
    // We have to rerun detection process to check if the new confidence score affects the results
    if(GLOBAL_VARIABLES.allImagePredictions.length) {
        handleDetectionProcess(GLOBAL_VARIABLES.allImagePredictions);
    }
}

function handleHideBoxesToggle(isChecked) {
    GLOBAL_VARIABLES.userOptions.toggles.hideResultBoxes.currentValue = isChecked;
    if(GLOBAL_VARIABLES.detected_objects.length) {
        GLOBAL_VARIABLES.detected_objects.forEach(obj => {
            obj.style.display = (GLOBAL_VARIABLES.userOptions.toggles.hideResultBoxes.currentValue === true)? 'none' : 'block';
        });
    }
}

// Programmatically trigger the checkbox to change value

function triggerHideBoxesCheckboxVisualUpdate(checkValue) {
    const hideBoxesCheckbox = document.getElementById('hideBoxesCheckbox');
    hideBoxesCheckbox.checked = checkValue;
    // It also performs UI updates if necessary
    handleHideBoxesToggle(checkValue);
}