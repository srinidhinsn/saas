import React from 'react';
import { XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';

const weeklyData = [
    { day: 'Mon', income: 2000, expense: 1500 },
    { day: 'Tue', income: 2500, expense: 1800 },
    { day: 'Wed', income: 2200, expense: 1600 },
    { day: 'Thu', income: 2800, expense: 2000 },
    { day: 'Fri', income: 3000, expense: 2500 }, // Key focus area
    { day: 'Sat', income: 2700, expense: 2300 },
    { day: 'Sun', income: 2600, expense: 2100 },
];
const WeeklyOverviewChart = () => (
    <ResponsiveContainer width="95%" height={300}>
        <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="income" fill="#ff7300" barSize={30} />
            <Bar dataKey="expense" fill="#000000" barSize={30} />
        </BarChart>
    </ResponsiveContainer>
);

export default WeeklyOverviewChart;