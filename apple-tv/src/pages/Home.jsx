import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {

  return (
    <main className='appleTv-home'>
      <h2><Link to="/apple-tv">애플티비 홈</Link></h2>
      {/* hero */}
      <div className="inner">
        {/* 시청중 리스트 */}
        {/* 인기영화 리스트 */}
        {/* tv 리스트 */}
      </div>
    </main>
  )
}

export default Home
