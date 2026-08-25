import type {SidebarConfig} from './index';

const financeSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'finance/index',
    label: '金融',
  },
  {
    type: 'category',
    label: '基础：建立概念',
    link: {
      type: 'doc',
      id: 'finance/基础/index',
    },
    items: [
      {
        type: 'doc',
        id: 'finance/基础/货币与货币体系',
        label: '货币与货币体系',
      },
      {
        type: 'doc',
        id: 'finance/基础/利率：钱的价格',
        label: '利率：钱的价格',
      },
      {
        type: 'doc',
        id: 'finance/基础/通货膨胀与通货紧缩',
        label: '通货膨胀与通货紧缩',
      },
      {
        type: 'doc',
        id: 'finance/基础/风险与收益的权衡',
        label: '风险与收益的权衡',
      },
      {
        type: 'doc',
        id: 'finance/基础/什么是股票',
        label: '什么是股票',
      },
      {
        type: 'doc',
        id: 'finance/基础/股票投资实操入门',
        label: '股票投资实操入门',
      },
      {
        type: 'doc',
        id: 'finance/基础/什么是基金',
        label: '什么是基金',
      },
      {
        type: 'doc',
        id: 'finance/基础/ETF与指数基金',
        label: 'ETF 与指数基金',
      },
      {
        type: 'doc',
        id: 'finance/基础/什么是债券',
        label: '什么是债券',
      },
      {
        type: 'doc',
        id: 'finance/基础/可转债',
        label: '可转债',
      },
      {
        type: 'doc',
        id: 'finance/基础/国债逆回购',
        label: '国债逆回购',
      },
    ],
  },
  {
    type: 'category',
    label: '进阶：深化理解',
    link: {
      type: 'doc',
      id: 'finance/进阶/index',
    },
    items: [
      {
        type: 'doc',
        id: 'finance/进阶/基金分类详解与封闭式基金',
        label: '基金分类详解与封闭式基金',
      },
      {
        type: 'doc',
        id: 'finance/进阶/REITs为什么会亏',
        label: 'REITs 为什么会亏',
      },
      {
        type: 'doc',
        id: 'finance/进阶/黄金投资与线上黄金',
        label: '黄金投资与线上黄金',
      },
      {
        type: 'doc',
        id: 'finance/进阶/股市黄金相关产品',
        label: '股市黄金相关产品',
      },
      {
        type: 'doc',
        id: 'finance/进阶/宏观经济与市场涨跌',
        label: '宏观经济与市场涨跌',
      },
      {
        type: 'doc',
        id: 'finance/进阶/估值方法初探',
        label: '估值方法初探',
      },
      {
        type: 'doc',
        id: 'finance/进阶/期货与衍生品入门',
        label: '期货与衍生品入门',
      },
      {
        type: 'doc',
        id: 'finance/进阶/期权与债券的关系',
        label: '期权与债券的关系',
      },
      {
        type: 'doc',
        id: 'finance/进阶/资产配置入门',
        label: '资产配置入门',
      },
      {
        type: 'doc',
        id: 'finance/进阶/风险管理基础',
        label: '风险管理基础',
      },
      {
        type: 'doc',
        id: 'finance/进阶/金融数据信息源',
        label: '金融数据信息源',
      },
    ],
  },
  {
    type: 'category',
    label: '实战：落地分析',
    link: {
      type: 'doc',
      id: 'finance/实战/index',
    },
    items: [
      {
        type: 'doc',
        id: 'finance/实战/投资品种全景对比',
        label: '投资品种全景对比',
      },
      {
        type: 'doc',
        id: 'finance/实战/技术分析入门',
        label: '技术分析入门',
      },
      {
        type: 'doc',
        id: 'finance/实战/基本面分析入门',
        label: '基本面分析入门',
      },
      {
        type: 'doc',
        id: 'finance/实战/财报阅读与获取',
        label: '财报阅读与获取',
      },
      {
        type: 'doc',
        id: 'finance/实战/江南高纤基本面分析实战',
        label: '江南高纤基本面分析实战',
      },
    ],
  },
];

export default financeSidebar;
