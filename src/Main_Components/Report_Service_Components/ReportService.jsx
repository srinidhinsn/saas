import React from 'react'
import SplashCursor from '../../Sub_Components/Arrow'
import ClickSpark from '../../Sub_Components/SparkArrow'

const ReportService = () => {
    return (
        <div className='Report-Service-container'>
            <SplashCursor />
            <ClickSpark
                sparkColor='#fff'
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
            >
                Shanmugam
            </ClickSpark>
        </div>
    )
}

export default ReportService
