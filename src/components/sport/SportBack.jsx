import React from 'react'
import { Link } from 'react-router-dom'

export const SportBack = () => {
    return (
        <div className="sport-live-back-wrap">
            <Link className="sport-detail-back" to="/sport">← 스포츠 홈으로</Link>
        </div>
    )
}
