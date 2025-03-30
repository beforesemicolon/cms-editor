export default {
  style: {
    p: {
      backgroundColor: '#496cff',
      padding: '10px',
      margin: '0',
      color: '#fff'
    }
  },
  inputs: [
    {
      name: 'content',
      type: 'text',
      value: 'Content',
    }
  ],
  render: (props) => {
    return `<p>${props.content}</p>`
  },
  content: ''
}
