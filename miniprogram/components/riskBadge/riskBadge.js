Component({
  properties: {
    risk: {
      type: String,
      value: '正常'
    }
  },

  data: {
    classMap: {
      '正常': 'tag-green',
      '预警': 'tag-amber',
      '注意': 'tag-blue',
      '紧急': 'tag-red'
    }
  }
})
