import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, bgColor, textColor, trend, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 bg-white">
        <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-5 rounded-full transform translate-x-12 -translate-y-12`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {trend && (
                <p className={`text-xs font-medium ${textColor}`}>{trend}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${bgColor} bg-opacity-10`}>
              <Icon className={`w-6 h-6 ${textColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}