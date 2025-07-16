import React, { useState, useEffect, useRef, useCallback } from 'react';

// 번역 문자열 객체
const TRANSLATIONS = {
  "en-US": {
    "title": "Colorful Mood Weather",
    "inputPlaceholder": "How are you feeling?",
    "updateButton": "Update",
    "processingText": "Thinking...",
    "recommendationTitle": "How about these feelings?",
    "drawingMessage": "Drawing your mood weather... Please wait a moment!",
    "visualsPrompt": "You are creating visuals for a social-emotional learning app for elementary school students. For the emotion '{emotion}', provide simple visual parameters as JSON. The emoji should be a single, common emoji. The backgroundColor should be a single, safe hex color. The movement should be one of: 'float', 'bounce', 'spin', 'grow'. Respond ONLY with valid JSON.",
    "recommendationsPrompt": "For a social-emotional learning app for elementary school students, suggest three new emotions related to '{emotion}'. The emotions should be simple, single words. Provide them as a JSON array of strings. Respond ONLY with valid JSON."
  },
  "ko-KR": {
    "title": "알록달록 마음 날씨",
    "inputPlaceholder": "어떤 기분인지 알려주세요",
    "updateButton": "바꾸기",
    "processingText": "생각 중...",
    "recommendationTitle": "이런 감정은 어때요?",
    "drawingMessage": "마음 날씨를 그리고 있어요... 잠시만 기다려 주세요!",
    "visualsPrompt": "초등학생을 위한 사회정서학습(SEL) 앱의 시각 자료를 만들고 있습니다. '{emotion}'이라는 감정에 대해, 간단한 시각적 파라미터를 JSON으로 제공해주세요. emoji는 흔하고 간단한 단일 이모지여야 합니다. backgroundColor는 안전한 단일 hex 색상이어야 합니다. movement는 'float'(둥실둥실), 'bounce'(통통), 'spin'(빙글빙글), 'grow'(커졌다 작아졌다) 중 하나여야 합니다. 유효한 JSON으로만 응답해주세요.",
    "recommendationsPrompt": "초등학생을 위한 사회정서학습(SEL) 앱을 위해, '{emotion}'과 관련된 새로운 감정 세 가지를 추천해주세요. 감정은 간단한 한글 단어여야 합니다. JSON 배열 형식으로 응답해주세요."
  }
};

// --- 유틸리티 함수 ---
const browserLocale = navigator.languages?.[0] || navigator.language || 'en-US';
const findMatchingLocale = (locale) => {
  if (TRANSLATIONS[locale]) return locale;
  const lang = locale.split('-')[0];
  const match = Object.keys(TRANSLATIONS).find(key => key.startsWith(lang + '-'));
  return match || 'en-US';
};
const locale = findMatchingLocale(browserLocale);
const t = (key) => TRANSLATIONS[locale]?.[key] || TRANSLATIONS['en-US'][key] || key;

// 배경색에 따라 대조적인 텍스트 색상을 반환하는 함수
const getContrastingTextColor = (hexColor) => {
    if (!hexColor || hexColor.length < 7) return '#FFFFFF';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#FFFFFF';
};


// --- API 호출 함수 ---
const callGeminiAPI = async (prompt, schema) => {
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    };
    const apiKey = ""; // API 키는 환경에서 처리되므로 비워둡니다.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
    }

    const result = await response.json();
    if (result.candidates && result.candidates.length > 0) {
        const jsonText = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    } else {
        throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
    }
};


// 메인 컴포넌트
const EmotionalAlgorithmicArt = () => {
  const [feeling, setFeeling] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visualParams, setVisualParams] = useState({
    backgroundColor: '#1a1a2e',
    emoji: '😊',
    particleCount: 20,
    movement: 'float'
  });
  const [recommendedFeelings, setRecommendedFeelings] = useState(['기쁨', '슬픔', '화남']);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameId = useRef(null);

  useEffect(() => {
    setTextColor(getContrastingTextColor(visualParams.backgroundColor));
  }, [visualParams.backgroundColor]);


  // --- 감정 분석 및 추천 생성 ---
  const analyzeAndRecommend = async (emotion) => {
    if (!emotion.trim()) return;
    setIsLoading(true);

    const visualsPrompt = t('visualsPrompt').replace('{emotion}', emotion);
    const visualsSchema = {
        type: "OBJECT",
        properties: {
            "backgroundColor": { "type": "STRING" },
            "emoji": { "type": "STRING" },
            "particleCount": { "type": "NUMBER" },
            "movement": { "type": "STRING", "enum": ["float", "bounce", "spin", "grow"] }
        },
        required: ["backgroundColor", "emoji", "particleCount", "movement"]
    };

    const recommendationsPrompt = t('recommendationsPrompt').replace('{emotion}', emotion);
    const recommendationsSchema = {
        type: "ARRAY",
        items: { "type": "STRING" }
    };

    try {
        const visuals = await callGeminiAPI(visualsPrompt, visualsSchema);
        setVisualParams(visuals);
        const recommendations = await callGeminiAPI(recommendationsPrompt, recommendationsSchema);
        setRecommendedFeelings(recommendations);
    } catch (error) {
        console.error('API 처리 중 오류 발생:', error);
        setVisualParams({
            backgroundColor: '#4a4a7f',
            emoji: '🤔',
            particleCount: 15,
            movement: 'bounce'
        });
        setRecommendedFeelings(['행복', '놀람', '궁금함']);
    } finally {
        setIsLoading(false);
    }
  };

  // --- 캔버스 애니메이션 로직 ---
  const initializeParticles = useCallback((canvas, params) => {
      if (!canvas || !params || !params.particleCount) return;
      const { particleCount } = params;
      particlesRef.current = Array.from({ length: particleCount }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 20 + 30,
          angle: 0,
          spin: (Math.random() - 0.5) * 0.05,
          scale: 1,
          scaleDirection: 1
      }));
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !visualParams) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
    };

    ctx.fillStyle = visualParams.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach(p => {
        switch (visualParams.movement) {
            case 'bounce':
                if (p.x + p.size / 2 > canvas.width || p.x - p.size / 2 < 0) p.vx *= -1;
                if (p.y + p.size / 2 > canvas.height || p.y - p.size / 2 < 0) p.vy *= -1;
                p.x += p.vx;
                p.y += p.vy;
                break;
            case 'spin':
                p.angle += p.spin;
                p.x += p.vx;
                p.y += p.vy;
                break;
            case 'grow':
                p.scale += 0.01 * p.scaleDirection;
                if (p.scale > 1.5 || p.scale < 0.5) p.scaleDirection *= -1;
                p.x += p.vx;
                p.y += p.vy;
                break;
            case 'float':
            default:
                p.x += p.vx;
                p.y += p.vy;
                p.y += Math.sin(p.x / 50) * 0.5;
                break;
        }

        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.x < -p.size) p.x = canvas.width + p.size;
        if (p.y > canvas.height + p.size) p.y = -p.size;
        if (p.y < -p.size) p.y = canvas.height + p.size;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.scale, p.scale);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(visualParams.emoji, 0, 0);
        ctx.restore();
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, [visualParams]);

  // --- useEffect 훅 ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
        if(!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initializeParticles(canvas, visualParams);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
        window.removeEventListener('resize', resizeCanvas);
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [animate, initializeParticles, visualParams]);
  
  useEffect(() => {
      initializeParticles(canvasRef.current, visualParams);
  }, [visualParams, initializeParticles]);


  // --- 이벤트 핸들러 ---
  const handleFeelingSubmit = (emotion) => {
    setFeeling('');
    analyzeAndRecommend(emotion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleFeelingSubmit(feeling);
    }
  };

  // --- JSX 렌더링 ---
  return (
    <div className="w-full h-screen relative overflow-hidden font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 transition-colors duration-1000" style={{ backgroundColor: visualParams.backgroundColor }}/>
      
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center text-white p-8 rounded-lg">
             <svg className="animate-spin h-12 w-12 text-white mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            <p className="text-lg font-semibold">{t('drawingMessage')}</p>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 p-4 sm:p-6 z-10">
        <h1 style={{ color: textColor }} className="text-xl sm:text-2xl font-bold tracking-wider transition-colors duration-500">{t('title')}</h1>
      </div>

      {/* 하단 인터랙션 영역 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-black/10 backdrop-blur-sm border-t border-white/20">
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
            <h2 style={{ color: textColor }} className="text-base text-center transition-colors duration-500">{t('recommendationTitle')}</h2>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {recommendedFeelings.map((recFeeling, index) => (
                  <button
                      key={index}
                      onClick={() => handleFeelingSubmit(recFeeling)}
                      disabled={isLoading}
                      style={{ 
                          color: textColor,
                          borderColor: textColor,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)'
                      }}
                      className="px-4 py-2 text-sm sm:text-base rounded-full font-semibold border backdrop-blur-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {recFeeling}
                  </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <input
                type="text"
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('inputPlaceholder')}
                disabled={isLoading}
                style={{ 
                    color: textColor,
                    borderColor: textColor,
                    '--placeholder-color': textColor
                }}
                className="px-4 py-2 sm:py-3 flex-grow rounded-lg bg-transparent border backdrop-blur-sm transition-colors duration-500 w-full placeholder-current focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50"
              />
              <button
                onClick={() => handleFeelingSubmit(feeling)}
                disabled={isLoading || !feeling.trim()}
                style={{ 
                    color: visualParams.backgroundColor,
                    backgroundColor: textColor,
                    borderColor: textColor
                }}
                className="flex items-center justify-center whitespace-nowrap px-6 py-2 sm:py-3 rounded-lg border font-bold transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90"
              >
                {t('updateButton')}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default EmotionalAlgorithmicArt;
