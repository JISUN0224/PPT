export const HTML_TEMPLATES = {
  title: `
    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px; font-family: var(--font-body);">
        <h1 style="font-family: var(--font-display); font-size: 72px; font-weight: 700; color: var(--primary-brown); margin-bottom: 20px; letter-spacing: 8px;">
            {{title}}
        </h1>
        <h2 style="font-size: 36px; color: var(--secondary-brown); margin-bottom: 30px;">
            {{subtitle}}
        </h2>
        <p style="font-size: 18px; color: var(--secondary-brown); max-width: 600px;">
            {{content}}
        </p>
        <div style="margin-top: 40px; display: flex; gap: 20px;">
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 15px 25px; border-radius: 15px; box-shadow: var(--shadow-soft);">
                <span style="font-size: 20px;">🎯</span>
                <span style="margin-left: 10px; color: var(--primary-brown); font-weight: 600;">{{valueBadge1}}</span>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 15px 25px; border-radius: 15px; box-shadow: var(--shadow-soft);">
                <span style="font-size: 20px;">🚀</span>
                <span style="margin-left: 10px; color: var(--primary-brown); font-weight: 600;">{{valueBadge2}}</span>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 15px 25px; border-radius: 15px; box-shadow: var(--shadow-soft);">
                <span style="font-size: 20px;">💡</span>
                <span style="margin-left: 10px; color: var(--primary-brown); font-weight: 600;">{{valueBadge3}}</span>
            </div>
        </div>
    </div>`,

  content: `
    <div style="height: 100%; padding: 40px 50px; display: flex; flex-direction: column; font-family: var(--font-body);">
        <h2 style="font-size: 36px; font-weight: 700; color: var(--primary-brown); text-align: left; margin-bottom: 30px;">{{title}}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; flex: 1; min-height: 0;">
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: #8B4513; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <span style="color: white; font-size: 20px;">📊</span>
                    </div>
                    <h3 style="color: var(--primary-brown); font-size: 18px;">{{point1}}</h3>
                </div>
                <p style="color: #666; line-height: 1.5; font-size: 14px;">{{point1Detail}}</p>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: #A0937D; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <span style="color: white; font-size: 20px;">💼</span>
                    </div>
                    <h3 style="color: var(--primary-brown); font-size: 18px;">{{point2}}</h3>
                </div>
                <p style="color: #666; line-height: 1.5; font-size: 14px;">{{point2Detail}}</p>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: #D4B5A0; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <span style="color: white; font-size: 20px;">🎯</span>
                    </div>
                    <h3 style="color: var(--primary-brown); font-size: 18px;">{{point3}}</h3>
                </div>
                <p style="color: #666; line-height: 1.5; font-size: 14px;">{{point3Detail}}</p>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: #E8D5C4; border: 2px solid #8B4513; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <span style="color: #8B4513; font-size: 20px;">🚀</span>
                    </div>
                    <h3 style="color: var(--primary-brown); font-size: 18px;">{{point4}}</h3>
                </div>
                <p style="color: #666; line-height: 1.5; font-size: 14px;">{{point4Detail}}</p>
            </div>
        </div>
    </div>`,

  chart: `
    <div style="height: 100%; padding: 35px 45px; display: flex; flex-direction: column; font-family: var(--font-body);">
        <h2 style="font-size: 36px; font-weight: 700; color: var(--primary-brown); text-align: center; margin-bottom: 25px;">{{title}}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; flex: 1; min-height: 0;">
            <div class="chart-area" style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); height: auto; display: flex; align-items: center; justify-content: center; color: #000; font-style: italic;">
                <div>{{chartPlaceholder}}</div>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: space-between;">
                <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 18px; margin-bottom: 15px; border-radius: 15px; box-shadow: var(--shadow-soft);">
                    <h3 style="color: #000; margin-bottom: 12px; display: flex; align-items: center; font-size: 18px;">
                        <span style="margin-right: 8px;">📈</span>
                        {{insightTitle1}}
                    </h3>
                    <p style="color: #000; line-height: 1.6; font-size: 17px;">{{insight1}}</p>
                </div>
                <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 18px; margin-bottom: 15px; border-radius: 15px; box-shadow: var(--shadow-soft);">
                    <h3 style="color: #000; margin-bottom: 12px; display: flex; align-items: center; font-size: 18px;">
                        <span style="margin-right: 8px;">🎯</span>
                        {{insightTitle2}}
                    </h3>
                    <p style="color: #000; line-height: 1.6; font-size: 17px;">{{insight2}}</p>
                </div>
                <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 18px; border-radius: 15px; box-shadow: var(--shadow-soft);">
                    <h3 style="color: #000; margin-bottom: 12px; display: flex; align-items: center; font-size: 18px;">
                        <span style="margin-right: 8px;">💡</span>
                        {{insightTitle3}}
                    </h3>
                    <p style="color: #000; line-height: 1.6; font-size: 17px;">{{insight3}}</p>
                </div>
            </div>
        </div>
    </div>`,

  process: `
    <div style="height: 100%; padding: 40px 50px; font-family: var(--font-body);">
        <h2 style="font-size: 36px; font-weight: 700; color: var(--primary-brown); text-align: center; margin-bottom: 40px;">{{title}}</h2>
        <div style="position: relative; padding: 20px 0;">
            <div style="position: absolute; top: 50%; left: 50px; right: 50px; height: 3px; background: linear-gradient(90deg, #8B4513 0%, #A0937D 50%, #D4B5A0 100%); transform: translateY(-50%);"></div>
            <div style="display: flex; justify-content: space-between; position: relative; z-index: 2;">
                <div style="flex: 1; text-align: center; margin: 0 10px;">
                    <div style="width: 60px; height: 60px; background: #8B4513; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(139, 69, 19, 0.1);">
                        <span style="color: white; font-size: 24px;">1</span>
                    </div>
                    <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); min-height: 150px;">
                        <h3 style="color: var(--primary-brown); margin-bottom: 10px; font-size: 18px;">{{step1Title}}</h3>
                        <p style="color: #666; font-size: 14px; line-height: 1.4;">{{step1Content}}</p>
                    </div>
                </div>
                <div style="flex: 1; text-align: center; margin: 0 10px;">
                    <div style="width: 60px; height: 60px; background: #A0937D; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(139, 69, 19, 0.1);">
                        <span style="color: white; font-size: 24px;">2</span>
                    </div>
                    <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); min-height: 150px;">
                        <h3 style="color: var(--primary-brown); margin-bottom: 10px; font-size: 18px;">{{step2Title}}</h3>
                        <p style="color: #666; font-size: 14px; line-height: 1.4;">{{step2Content}}</p>
                    </div>
                </div>
                <div style="flex: 1; text-align: center; margin: 0 10px;">
                    <div style="width: 60px; height: 60px; background: #D4B5A0; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(139, 69, 19, 0.1);">
                        <span style="color: white; font-size: 24px;">3</span>
                    </div>
                    <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); min-height: 150px;">
                        <h3 style="color: var(--primary-brown); margin-bottom: 10px; font-size: 18px;">{{step3Title}}</h3>
                        <p style="color: #666; font-size: 14px; line-height: 1.4;">{{step3Content}}</p>
                    </div>
                </div>
                <div style="flex: 1; text-align: center; margin: 0 10px;">
                    <div style="width: 60px; height: 60px; background: #E8D5C4; border: 3px solid #8B4513; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(139, 69, 19, 0.1);">
                        <span style="color: #8B4513; font-size: 24px;">4</span>
                    </div>
                    <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 20px; border-radius: 15px; box-shadow: var(--shadow-soft); min-height: 150px;">
                        <h3 style="color: var(--primary-brown); margin-bottom: 10px; font-size: 18px;">{{step4Title}}</h3>
                        <p style="color: #666; font-size: 14px; line-height: 1.4;">{{step4Content}}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`,

  conclusion: `
    <div style="height: 100%; padding: 40px 50px; font-family: var(--font-body);">
        <h2 style="font-size: 36px; font-weight: 700; color: var(--primary-brown); text-align: center; margin-bottom: 30px;">{{title}}</h2>
        <div style="margin-bottom: 40px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
                <div style="flex: 1; margin-right: 20px;">
                    <h3 style="color: #8B4513; margin-bottom: 20px; font-size: 24px;">{{keyAchievementsTitle}}</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px; display: flex; align-items: center;">
                            <span style="width: 8px; height: 8px; background: #8B4513; border-radius: 50%; margin-right: 15px;"></span>
                            <span style="color: #555; font-size: 16px;">{{point1}}</span>
                        </li>
                        <li style="margin-bottom: 15px; display: flex; align-items: center;">
                            <span style="width: 8px; height: 8px; background: #8B4513; border-radius: 50%; margin-right: 15px;"></span>
                            <span style="color: #555; font-size: 16px;">{{point2}}</span>
                        </li>
                        <li style="margin-bottom: 15px; display: flex; align-items: center;">
                            <span style="width: 8px; height: 8px; background: #8B4513; border-radius: 50%; margin-right: 15px;"></span>
                            <span style="color: #555; font-size: 16px;">{{point3}}</span>
                        </li>
                    </ul>
                </div>
                <div class="ppt-card" tabindex="0" style="background: linear-gradient(135deg, var(--background) 0%, var(--cream) 100%); padding: 30px; border-radius: 15px; box-shadow: var(--shadow-soft); min-width: 200px; text-align: center;">
                    <div style="font-size: 48px; font-weight: 700; color: #8B4513; margin-bottom: 10px;">{{mainStat}}</div>
                    <div style="font-size: 16px; color: #A0937D; font-weight: 500;">{{mainStatLabel}}</div>
                </div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px;">
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 30px 20px; border-radius: 15px; box-shadow: var(--shadow-soft); text-align: center;">
                <div style="font-size: 36px; font-weight: 700; color: var(--primary-brown); margin-bottom: 10px;">{{stat1Value}}</div>
                <div style="font-size: 14px; color: var(--secondary-brown); text-transform: uppercase;">{{stat1Label}}</div>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 30px 20px; border-radius: 15px; box-shadow: var(--shadow-soft); text-align: center;">
                <div style="font-size: 36px; font-weight: 700; color: var(--primary-brown); margin-bottom: 10px;">{{stat2Value}}</div>
                <div style="font-size: 14px; color: var(--secondary-brown); text-transform: uppercase;">{{stat2Label}}</div>
            </div>
            <div class="ppt-card" tabindex="0" style="background: var(--background); padding: 30px 20px; border-radius: 15px; box-shadow: var(--shadow-soft); text-align: center;">
                <div style="font-size: 36px; font-weight: 700; color: var(--primary-brown); margin-bottom: 10px;">{{stat3Value}}</div>
                <div style="font-size: 14px; color: var(--secondary-brown); text-transform: uppercase;">{{stat3Label}}</div>
            </div>
        </div>
    </div>`
};

// 페이지 수에 따른 템플릿 선택 규칙
export const getTemplateSequence = (slideCount: number): string[] => {
  const sequences: Record<number, string[]> = {
    3: ['title', 'content', 'conclusion'],
    4: ['title', 'content', 'chart', 'conclusion'],
    5: ['title', 'content', 'chart', 'content', 'conclusion'],
    6: ['title', 'content', 'chart', 'process', 'content', 'conclusion'],
    7: ['title', 'content', 'chart', 'content', 'process', 'content', 'conclusion'],
    8: ['title', 'content', 'chart', 'content', 'process', 'content', 'chart', 'conclusion'],
  };
  return sequences[slideCount] || sequences[5];
};

// JSON → HTML 바인딩
export const bindTemplateData = (slide: any): string => {
  const template = (HTML_TEMPLATES as any)[slide.templateType];
  let html = template || '';
  if (!html) return '';

  // 1) 템플릿 내 모든 토큰 수집
  const tokenRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(html)) !== null) {
    const key = m[1];
    if (!tokens.includes(key)) tokens.push(key);
  }

  // 2) 통계/포인트 보조 매핑
  const stats: Array<{ value?: any; label?: any }> = Array.isArray(slide?.stats) ? slide.stats : [];
  const points: string[] = Array.isArray(slide?.points) ? slide.points : [];

  const deriveValue = (key: string): string => {
    if (key.startsWith('stat') && (key.endsWith('Value') || key.endsWith('Label'))) {
      const idx = Number(key.replace(/[^0-9]/g, '')) - 1;
      if (Number.isFinite(idx) && idx >= 0) {
        if (key.endsWith('Value')) return stats[idx]?.value != null ? String(stats[idx].value) : '';
        if (key.endsWith('Label')) return stats[idx]?.label != null ? String(stats[idx].label) : '';
      }
    }
    if (/^point[1-6]$/.test(key)) {
      const idx = Number(key.replace('point', '')) - 1;
      return points[idx] != null ? String(points[idx]) : '';
    }
    if (/^point[1-6]Detail$/.test(key)) {
      // 상세는 별도 제공 없으면 공란 유지
      return slide[key] != null ? String(slide[key]) : '';
    }
    if (key === 'mainStat' && slide?.mainStat == null && stats[0]?.value != null) {
      return String(stats[0].value);
    }
    if (key === 'mainStatLabel' && slide?.mainStatLabel == null && stats[0]?.label != null) {
      return String(stats[0].label);
    }
    return slide[key] != null ? String(slide[key]) : '';
  };

  // 3) 토큰 치환 + 디버그 로깅
  const missing: string[] = [];
  tokens.forEach((key) => {
    const value = deriveValue(key);
    if (value === '' && !(key in slide)) missing.push(key);
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(regex, value);
  });
  try {
    if (missing.length > 0) {
      // template binding warning trimmed
    }
  } catch {}
  return html;
};


