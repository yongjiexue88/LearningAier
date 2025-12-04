// Logo component for LearningAier
// Uses the cute blue AI mascot with graduation cap

import logo from '../assets/images/logo.svg';

interface LogoProps {
    size?: number;
    className?: string;
}

export function Logo({ size = 40, className = '' }: LogoProps) {
    return (
        <img
            src={logo}
            alt="LearningAier Logo"
            width={size}
            height={size}
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
}

export default Logo;
