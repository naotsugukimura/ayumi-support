/**
 * AI解析結果をアセスメント表データにマッピングするサービス
 */
class AIAssessmentMapper {
  constructor() {
    this.keywordToADLMapping = {
      // 食事関連キーワード
      '食事': { category: 'adl_eating', suggestedLevel: 4 },
      '摂取': { category: 'adl_eating', suggestedLevel: 4 },
      '食べ': { category: 'adl_eating', suggestedLevel: 4 },
      '栄養': { category: 'adl_eating', suggestedLevel: 4 },
      
      // 更衣関連キーワード
      '服装': { category: 'adl_dressing', suggestedLevel: 4 },
      '着替え': { category: 'adl_dressing', suggestedLevel: 4 },
      '身だしなみ': { category: 'adl_dressing', suggestedLevel: 4 },
      
      // 入浴・清潔関連キーワード
      '入浴': { category: 'adl_bathing', suggestedLevel: 4 },
      '清潔': { category: 'adl_bathing', suggestedLevel: 4 },
      '衛生': { category: 'adl_bathing', suggestedLevel: 4 },
      
      // 移動関連キーワード
      '移動': { category: 'adl_mobility', suggestedLevel: 4 },
      '通勤': { category: 'adl_mobility', suggestedLevel: 4 },
      '交通': { category: 'iadl_transport', suggestedLevel: 4 },
      '電車': { category: 'iadl_transport', suggestedLevel: 4 },
      'バス': { category: 'iadl_transport', suggestedLevel: 4 },
      
      // コミュニケーション関連キーワード
      'コミュニケーション': { category: 'comm_expression', suggestedLevel: 3 },
      '会話': { category: 'comm_expression', suggestedLevel: 3 },
      '対人': { category: 'comm_relationship', suggestedLevel: 3 },
      '人間関係': { category: 'comm_relationship', suggestedLevel: 3 },
      '理解': { category: 'comm_understanding', suggestedLevel: 3 },
      '説明': { category: 'comm_expression', suggestedLevel: 3 },
      
      // 作業関連キーワード
      '作業': { category: 'work_endurance', suggestedLevel: 3 },
      '仕事': { category: 'work_endurance', suggestedLevel: 3 },
      '集中': { category: 'work_endurance', suggestedLevel: 3 },
      '持続': { category: 'work_endurance', suggestedLevel: 3 },
      '正確': { category: 'work_accuracy', suggestedLevel: 3 },
      '丁寧': { category: 'work_accuracy', suggestedLevel: 4 },
      '時間': { category: 'work_time', suggestedLevel: 3 },
      '管理': { category: 'work_time', suggestedLevel: 3 },
      
      // 金銭管理関連キーワード
      '金銭': { category: 'iadl_money', suggestedLevel: 3 },
      'お金': { category: 'iadl_money', suggestedLevel: 3 },
      '買い物': { category: 'iadl_shopping', suggestedLevel: 3 },
      '計算': { category: 'iadl_money', suggestedLevel: 3 }
    };

    // 困難度を示すキーワード
    this.difficultyKeywords = {
      'できない': -2,
      '困難': -2,
      '苦手': -1,
      '不安': -1,
      '課題': -1,
      '問題': -1,
      'できる': +1,
      '得意': +2,
      '上手': +2,
      '自立': +2,
      '自分で': +1
    };
  }

  /**
   * AI解析結果をアセスメントデータに変換
   * @param {Object} aiAnalysis - AI解析結果
   * @returns {Object} アセスメント表用データ
   */
  mapAIToAssessment(aiAnalysis) {
    try {
      const structuredData = aiAnalysis.structured_data || aiAnalysis;
      
      // 基本情報の抽出
      const basicInfo = this.extractBasicInfo(structuredData);
      
      // ADL/IADL評価の推定
      const adlAssessment = this.estimateADLLevels(structuredData);
      
      // コミュニケーション評価の推定
      const commAssessment = this.estimateCommLevels(structuredData);
      
      // 職業能力評価の推定
      const workAssessment = this.estimateWorkLevels(structuredData);
      
      // 総合所見の生成
      const overallAssessment = this.generateOverallAssessment(structuredData);
      
      // 支援優先度の生成
      const supportPriority = this.generateSupportPriority(structuredData);

      return {
        // 基本情報
        ...basicInfo,
        
        // ADL評価
        ...adlAssessment,
        
        // コミュニケーション評価
        ...commAssessment,
        
        // 職業能力評価
        ...workAssessment,
        
        // 総合所見
        overall_assessment: overallAssessment,
        support_priority: supportPriority,
        
        // メタデータ
        ai_generated: true,
        generated_at: new Date().toISOString(),
        confidence_score: this.calculateConfidenceScore(structuredData)
      };
    } catch (error) {
      console.error('AI解析結果のマッピングエラー:', error);
      return this.getDefaultAssessment();
    }
  }

  /**
   * 基本情報の抽出
   */
  extractBasicInfo(data) {
    const participantInfo = data.participant_info || {};
    
    return {
      userName: participantInfo['利用者'] || '',
      assessor: participantInfo['支援員'] || '',
      age: '', // AI解析からは抽出困難
      disabilityType: this.inferDisabilityType(data),
      interviewCount: '1'
    };
  }

  /**
   * 障害タイプの推定
   */
  inferDisabilityType(data) {
    const text = JSON.stringify(data).toLowerCase();
    
    if (text.includes('知的') || text.includes('認知')) return '知的障害';
    if (text.includes('精神') || text.includes('うつ') || text.includes('統合失調症')) return '精神障害';
    if (text.includes('発達') || text.includes('自閉症') || text.includes('adhd')) return '発達障害';
    if (text.includes('身体') || text.includes('車椅子') || text.includes('麻痺')) return '身体障害';
    
    return '知的障害'; // デフォルト
  }

  /**
   * ADL/IADL評価レベルの推定
   */
  estimateADLLevels(data) {
    const text = this.extractRelevantText(data);
    const assessment = {};
    
    // デフォルト値設定
    const defaultADL = {
      adl_eating: '4',
      adl_eating_comment: '普通食を自立して摂取できる',
      adl_dressing: '4',
      adl_dressing_comment: '季節に適した服装を選択できる',
      adl_bathing: '4',
      adl_bathing_comment: '入浴・身だしなみを適切に管理',
      adl_mobility: '5',
      adl_mobility_comment: '公共交通機関を利用して通所可能',
      iadl_money: '3',
      iadl_money_comment: '家計簿記録に支援が必要',
      iadl_transport: '4',
      iadl_transport_comment: '慣れたルートは自立して利用可能'
    };

    // キーワードベースでの調整
    Object.keys(this.keywordToADLMapping).forEach(keyword => {
      if (text.includes(keyword)) {
        const mapping = this.keywordToADLMapping[keyword];
        let level = mapping.suggestedLevel;
        
        // 困難度キーワードで調整
        Object.keys(this.difficultyKeywords).forEach(diffKeyword => {
          if (text.includes(keyword + diffKeyword) || text.includes(diffKeyword + keyword)) {
            level = Math.max(1, Math.min(5, level + this.difficultyKeywords[diffKeyword]));
          }
        });
        
        assessment[mapping.category] = level.toString();
        assessment[mapping.category + '_comment'] = this.generateComment(keyword, level);
      }
    });

    return { ...defaultADL, ...assessment };
  }

  /**
   * コミュニケーション評価レベルの推定
   */
  estimateCommLevels(data) {
    const text = this.extractRelevantText(data);
    
    // 基本レベル（AIからの分析内容に基づいて調整）
    let understandingLevel = 3;
    let expressionLevel = 3;
    let relationshipLevel = 3;
    let groupLevel = 3;

    // コミュニケーション関連の課題を検出
    if (text.includes('コミュニケーション') && text.includes('課題')) {
      expressionLevel = 2;
      relationshipLevel = 2;
    }
    
    if (text.includes('理解') && text.includes('困難')) {
      understandingLevel = 2;
    }
    
    if (text.includes('対人') && text.includes('不安')) {
      relationshipLevel = 2;
    }

    return {
      comm_understanding: understandingLevel.toString(),
      comm_understanding_comment: this.generateCommComment('理解', understandingLevel),
      comm_expression: expressionLevel.toString(),
      comm_expression_comment: this.generateCommComment('表出', expressionLevel),
      comm_relationship: relationshipLevel.toString(),
      comm_relationship_comment: this.generateCommComment('対人関係', relationshipLevel),
      comm_group: groupLevel.toString(),
      comm_group_comment: this.generateCommComment('集団参加', groupLevel)
    };
  }

  /**
   * 職業能力評価レベルの推定
   */
  estimateWorkLevels(data) {
    const text = this.extractRelevantText(data);
    
    let enduranceLevel = 3;
    let accuracyLevel = 3;
    let instructionLevel = 3;
    let timeLevel = 3;

    // 作業関連の評価
    if (text.includes('集中') && text.includes('時間')) {
      enduranceLevel = 3;
    }
    
    if (text.includes('正確') || text.includes('丁寧')) {
      accuracyLevel = 4;
    }
    
    if (text.includes('時間管理') && text.includes('課題')) {
      timeLevel = 2;
    }

    return {
      work_endurance: enduranceLevel.toString(),
      work_endurance_comment: this.generateWorkComment('持続力', enduranceLevel),
      work_accuracy: accuracyLevel.toString(),
      work_accuracy_comment: this.generateWorkComment('正確性', accuracyLevel),
      work_instruction: instructionLevel.toString(),
      work_instruction_comment: this.generateWorkComment('指示理解', instructionLevel),
      work_time: timeLevel.toString(),
      work_time_comment: this.generateWorkComment('時間管理', timeLevel)
    };
  }

  /**
   * 総合所見の生成
   */
  generateOverallAssessment(data) {
    const assessment = data.assessment || {};
    const strengths = assessment['強み・できること'] || [];
    const needsSupport = assessment['支援が必要な領域'] || [];
    
    let overallText = '基本的な生活スキルは概ね身についており、就労に向けた訓練が可能なレベルである。';
    
    if (Array.isArray(strengths) && strengths.length > 0) {
      overallText += ` 特に${strengths.slice(0, 2).join('、')}の面で強みを持っている。`;
    }
    
    if (Array.isArray(needsSupport) && needsSupport.length > 0) {
      overallText += ` ${needsSupport.slice(0, 2).join('、')}の面での支援が必要。`;
    }
    
    return overallText;
  }

  /**
   * 支援優先度の生成
   */
  generateSupportPriority(data) {
    const needsSupport = data.assessment?.['支援が必要な領域'] || [];
    const actionPlan = data.action_plan || {};
    
    let priorities = [];
    
    if (Array.isArray(needsSupport)) {
      needsSupport.forEach((need, index) => {
        priorities.push(`${index + 1}. ${need}の支援を優先的に実施`);
      });
    }
    
    if (actionPlan['短期目標']) {
      priorities.push(`${priorities.length + 1}. ${actionPlan['短期目標']}に向けた段階的支援`);
    }
    
    return priorities.join('\n') || 'コミュニケーション支援を優先的に実施';
  }

  /**
   * 関連テキストの抽出
   */
  extractRelevantText(data) {
    const relevantFields = [
      data.summary,
      data.interview_content?.['主訴・相談内容'],
      data.interview_content?.['現在の状況'],
      data.interview_content?.['課題・困りごと'],
      data.assessment?.['環境要因'],
      ...(data.assessment?.['強み・できること'] || []),
      ...(data.assessment?.['支援が必要な領域'] || [])
    ];
    
    return relevantFields.filter(Boolean).join(' ').toLowerCase();
  }

  /**
   * コメント生成
   */
  generateComment(keyword, level) {
    const comments = {
      1: `${keyword}について大幅な支援が必要`,
      2: `${keyword}について支援が必要`,
      3: `${keyword}について一部支援が必要`,
      4: `${keyword}について概ね自立`,
      5: `${keyword}について完全に自立`
    };
    return comments[level] || `${keyword}について評価が必要`;
  }

  /**
   * コミュニケーションコメント生成
   */
  generateCommComment(type, level) {
    const baseComments = {
      '理解': ['複雑な指示の理解が困難', '指示の理解に一部支援が必要', '複雑な指示には確認が必要', '基本的な指示は理解可能', '全ての指示を正確に理解'],
      '表出': ['自分の気持ちを表現することが困難', '感情表現に支援が必要', '感情表現に課題、支援で改善', '基本的な意思疎通は可能', '自分の気持ちを適切に表現'],
      '対人関係': ['対人関係の構築が困難', '対人関係に大きな不安', '職場での関係構築に不安あり', '基本的な対人関係は良好', '良好な対人関係を構築'],
      '集団参加': ['集団活動への参加が困難', '集団活動に消極的', '集団活動に一部参加可能', '集団活動に概ね参加可能', '集団活動に積極的に参加']
    };
    
    return baseComments[type]?.[level - 1] || `${type}について評価が必要`;
  }

  /**
   * 職業能力コメント生成
   */
  generateWorkComment(type, level) {
    const baseComments = {
      '持続力': ['作業への集中が困難', '短時間の作業のみ可能', '2時間程度の作業は集中して取り組める', '半日程度の作業が可能', '一日中集中して作業可能'],
      '正確性': ['作業の正確性に課題', '確認により正確性を保てる', '手順確認により正確性を保てる', '概ね正確な作業が可能', '常に正確な作業を実施'],
      '指示理解': ['指示の理解が困難', '簡単な指示のみ理解可能', '基本的な指示は理解可能', '複雑な指示も理解可能', '全ての指示を正確に理解'],
      '時間管理': ['時間管理が困難', '時間管理に大きな支援が必要', '休憩時間の管理に課題', '基本的な時間管理は可能', '適切な時間管理が可能']
    };
    
    return baseComments[type]?.[level - 1] || `${type}について評価が必要`;
  }

  /**
   * 信頼度スコアの計算
   */
  calculateConfidenceScore(data) {
    let score = 0;
    
    // データの完全性をチェック
    if (data.participant_info) score += 20;
    if (data.interview_content) score += 30;
    if (data.assessment) score += 30;
    if (data.action_plan) score += 20;
    
    return Math.min(100, score);
  }

  /**
   * デフォルトアセスメントデータ
   */
  getDefaultAssessment() {
    return {
      userName: '',
      assessor: '',
      age: '',
      disabilityType: '',
      interviewCount: '1',
      
      adl_eating: '3',
      adl_eating_comment: '',
      adl_dressing: '3',
      adl_dressing_comment: '',
      adl_bathing: '3',
      adl_bathing_comment: '',
      adl_mobility: '3',
      adl_mobility_comment: '',
      
      iadl_money: '3',
      iadl_money_comment: '',
      iadl_transport: '3',
      iadl_transport_comment: '',
      
      comm_understanding: '3',
      comm_understanding_comment: '',
      comm_expression: '3',
      comm_expression_comment: '',
      comm_relationship: '3',
      comm_relationship_comment: '',
      comm_group: '3',
      comm_group_comment: '',
      
      work_endurance: '3',
      work_endurance_comment: '',
      work_accuracy: '3',
      work_accuracy_comment: '',
      work_instruction: '3',
      work_instruction_comment: '',
      work_time: '3',
      work_time_comment: '',
      
      overall_assessment: '',
      support_priority: '',
      
      ai_generated: false,
      confidence_score: 0
    };
  }
}

module.exports = new AIAssessmentMapper();