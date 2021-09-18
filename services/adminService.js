const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User, Tweet, Reply, Like, Followship, Sequelize } = require('../models')
const sequelize = require('sequelize')

const adminService = {
  adminSignIn: async (account, password) => {
    const user = await User.findOne({ where: { account } })
    if (!user) {
      return { status: 'error', message: 'no such user found' }
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return { status: 'error', message: 'passwords did not match' }
    }
    if (user.role !== 'admin') {
      return {
        status: 'error',
        message: 'Cannot access this account',
      }
    }
    // Give token
    const payload = { id: user.id }
    const token = jwt.sign(payload, process.env.JWT_SECRET)

    return {
      status: 'success',
      message: 'Successfully login',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  },
  getUsers: async () => {
    const users = await User.findAll({
      where: { role: 'user' },
      include: [
        {
          model: Tweet,
          attributes: [['id', 'TweetId']]
        },
      ],
      attributes: [
        'id',
        'account',
        'name',
        'avatar',
        'cover',
        [Sequelize.literal('(SELECT COUNT(*) FROM Tweets WHERE Tweets.UserId = User.id)'), 'TweetsCount'],
        [
          Sequelize.literal('(SELECT COUNT(*) FROM Tweets INNER JOIN Likes ON Tweets.id = Likes.TweetId WHERE Tweets.UserId = User.id)'),
          'LikesCount',
        ],
        [Sequelize.literal('(SELECT COUNT(*) FROM FOLLOWSHIPS WHERE Followships.followingId = User.id)'), 'FollowersCount'],
        [Sequelize.literal('(SELECT COUNT(*) FROM FOLLOWSHIPS WHERE Followships.followerId = User.id)'), 'FollowingCount'],
      ],
      order: [[Sequelize.col('TweetsCount'), 'DESC']],
    })
    return users
  },
  getTweets: async () => {
    const tweets = await Tweet.findAll({
      include: [
        { 
          model: User,
          attributes: [['id', 'UserId'], 'name', 'account', 'avatar']
        }
      ],
      attributes: [
        'id',
        'description',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    })
    return tweets
  },
  deleteTweet: async (id) => {
    const tweet = await Tweet.findByPk(id)
    if (!tweet) {
      return {
        status: 'error', message: 'Tweet does not exist'
      }
    }
    await tweet.destroy()
    return {
      status: 'success', message: `Successfully deleted tweet TweetId: ${id}`
    }
  }
}

module.exports = adminService