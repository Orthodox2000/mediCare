import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

const stats = [
        { value: '50K+', label: 'Patients Served' },
        { value: '500+', label: 'Expert Doctors' },
        { value: '98%', label: 'Satisfaction Rate' },
        { value: '24/7', label: 'Support Available' }
    ];

interface Theme {
  cardBg: string;
  border: string;
  textSecondary: string;
}

function StatCard({ value, label  }: { value: string; label: string;   }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const [displayValue, setDisplayValue] = useState<number>(0);

  const numericValue = parseInt(value.replace(/\D/g, ''), 10);

  useEffect(() => {
    if (inView) {
      let start = 0;
      const duration = 3000; // ms
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentCount = Math.floor(progress * numericValue);
        setDisplayValue(currentCount);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(numericValue);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [inView, numericValue]);

  return (
    <div
      ref={ref}
      className={`  rounded-2xl p-6 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-xl  border border-gray-300`}
    >
      <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
        {displayValue}
        {value.match(/\D+$/) ? value.match(/\D+$/)![0] : ''}
      </div>
      <div  >{label}</div>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <StatCard key={i} value={stat.value} label={stat.label}  />
          ))}
        </div>
      </div>
    </section>
  );
}