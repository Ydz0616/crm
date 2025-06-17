/**
 * 将数字转换为中文大写金额
 * @param {number} num - 需要转换的数字
 * @returns {string} - 中文大写金额
 */
function numberToChineseAmount(num) {
  if (isNaN(num)) return '参数错误';
  
  // 四舍五入到2位小数
  num = Math.round(num * 100) / 100;
  
  // 分离整数和小数部分
  const parts = num.toString().split('.');
  let integer = parts[0];
  let decimal = parts.length > 1 ? parts[1] : '';
  
  // 如果小数只有一位，补零
  if (decimal.length === 1) {
    decimal += '0';
  } else if (decimal.length === 0) {
    decimal = '00';
  }
  
  // 中文数字
  const cnNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  // 整数部分单位
  const cnIntUnits = ['', '拾', '佰', '仟'];
  // 整数部分大单位
  const cnBigUnits = ['', '万', '亿', '兆'];
  // 小数部分单位
  const cnDecUnits = ['角', '分'];
  
  // 转换整数部分
  let chineseInteger = '';
  
  // 处理0
  if (parseInt(integer) === 0) {
    chineseInteger = cnNums[0];
  } else {
    // 将整数部分按4位分组处理
    const groups = [];
    while (integer.length > 0) {
      groups.unshift(integer.slice(-4));
      integer = integer.slice(0, -4);
    }
    
    // 处理每个分组
    for (let i = 0; i < groups.length; i++) {
      let groupChinese = '';
      const group = groups[i];
      
      // 处理当前组的每一位
      for (let j = 0; j < group.length; j++) {
        const digit = parseInt(group[j]);
        const unit = cnIntUnits[group.length - j - 1];
        
        if (digit !== 0) {
          groupChinese += cnNums[digit] + unit;
        } else {
          // 处理连续的0
          if (groupChinese.length > 0 && groupChinese[groupChinese.length - 1] !== cnNums[0]) {
            groupChinese += cnNums[0];
          }
        }
      }
      
      // 添加大单位（万、亿等）
      if (groupChinese !== '') {
        // 去掉末尾的零
        if (groupChinese[groupChinese.length - 1] === cnNums[0]) {
          groupChinese = groupChinese.slice(0, -1);
        }
        
        chineseInteger += groupChinese + cnBigUnits[groups.length - i - 1];
      }
    }
  }
  
  // 转换小数部分
  let chineseDecimal = '';
  for (let i = 0; i < decimal.length; i++) {
    const digit = parseInt(decimal[i]);
    if (digit !== 0) {
      chineseDecimal += cnNums[digit] + cnDecUnits[i];
    } else if (chineseDecimal !== '') {
      // 如果前面已经有值，且当前位是0，则添加零
      chineseDecimal += cnNums[digit];
    }
  }
  
  // 组合整数和小数部分
  let result = '';
  if (chineseInteger !== '') {
    result += chineseInteger + '元';
    if (chineseDecimal === '') {
      result += '整';
    }
  }
  
  if (chineseDecimal !== '') {
    result += chineseDecimal;
  }
  
  return result;
}

module.exports = {
  numberToChineseAmount
}; 