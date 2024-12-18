const params = {
  author: {
    resourceName: 'author',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: [ 'name' ]
    },
    authorize: true
  },
  post: {
    resourceName: 'post',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content:  { type: 'string' },
        authorId: { type: 'string' }
      },
      required: [ 'title', 'authorId' ]
    },
    authorize: true
  },
  comment: {
    resourceName: 'comment',
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string' },
        postId: { type: 'string' }
      },
      required: [ 'body', 'postId' ]
    },
    authorize: true
  },
};

module.exports = { params };
