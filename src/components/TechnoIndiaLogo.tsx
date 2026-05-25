/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface TechnoIndiaLogoProps {
  className?: string;
}

export function TechnoIndiaLogo({ className = "w-10 h-10" }: TechnoIndiaLogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none shrink-0`}
    >
      {/* Crisp circular red branding background matching Techno India red */}
      <circle cx="100" cy="100" r="95" fill="#DA1C1D" />
      
      {/* Artistic SVG curves capturing the exact stylish "ti" monogram from the uploaded image */}
      <g fill="#FFFFFF">
        {/* The 't' stem and top serif/left-pointing horn */}
        <path d="M 112 38 
                 C 107 38, 97 44, 91 49 
                 C 86 53, 83 58, 83 66 
                 L 83 83 
                 L 66 83 
                 C 62 83, 60 85, 60 89
                 L 60 100
                 C 60 104, 62 106, 66 106
                 L 83 106
                 L 83 145
                 C 83 158, 86 166, 95 170
                 C 102 173, 114 173, 122 168
                 C 126 165, 127 160, 124 156
                 L 116 146
                 C 113 142, 108 141, 103 143
                 C 99 145, 97 141, 97 136
                 L 97 106
                 L 118 106
                 C 122 106, 125 104, 125 100
                 L 125 89
                 C 125 85, 122 83, 118 83
                 L 97 83
                 L 97 66
                 C 97 62, 99 59, 103 57
                 C 107 55, 114 55, 117 58
                 C 119 60, 122 59, 123 57
                 L 128 47
                 C 130 43, 127 38, 112 38 Z" />

        {/* The 'i' element and connecting cursive stylized bar */}
        <path d="M 120 78
                 L 142 78
                 C 146 78, 148 81, 149 84
                 L 161 146
                 C 162 150, 160 154, 156 156
                 L 138 165
                 C 134 167, 130 165, 129 161
                 L 116 95
                 C 115 91, 116 88, 119 86
                 C 120 84, 119 81, 116 81
                 L 114 81
                 C 111 81, 109 80, 110 77
                 Z" />
                 
        {/* The beautiful slanted ligature matching the TIG monogram's joining segment */}
        <polygon points="113,83 133,83 148,154 128,154" opacity="0.95" />
      </g>
    </svg>
  );
}
