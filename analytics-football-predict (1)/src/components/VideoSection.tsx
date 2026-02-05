import React, { useState } from 'react';
import { Play, Clock, Calendar, ChevronRight, Eye, ThumbsUp } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  date: string;
  views: string;
  likes: string;
  week: number;
}

const videos: Video[] = [
  {
    id: '1',
    title: 'Week 16 Predictions: Eagles vs Cowboys, Chiefs vs Bills',
    description: 'Breaking down the biggest games of Week 16 with our AI model predictions and key factors to watch.',
    thumbnail: 'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101527992_8e96bca5.jpg',
    duration: '18:42',
    date: 'Dec 18, 2024',
    views: '12.4K',
    likes: '892',
    week: 16,
  },
  {
    id: '2',
    title: 'Week 15 Recap: Model Goes 12-4, Key Insights',
    description: 'Reviewing last week\'s predictions and what the model learned from the results.',
    thumbnail: 'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101601348_8c98a44c.png',
    duration: '14:28',
    date: 'Dec 16, 2024',
    views: '8.7K',
    likes: '654',
    week: 15,
  },
  {
    id: '3',
    title: 'Playoff Picture Analysis: Who\'s In, Who\'s Out',
    description: 'Using our model to simulate playoff scenarios and predict the final standings.',
    thumbnail: 'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101595555_d954a8aa.jpg',
    duration: '22:15',
    date: 'Dec 14, 2024',
    views: '15.2K',
    likes: '1.1K',
    week: 15,
  },
  {
    id: '4',
    title: 'Week 14 Predictions Deep Dive',
    description: 'Detailed analysis of every Week 14 matchup with statistical breakdowns.',
    thumbnail: 'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101601078_9225bb23.png',
    duration: '25:33',
    date: 'Dec 7, 2024',
    views: '9.3K',
    likes: '712',
    week: 14,
  },
];

const VideoSection: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayVideo = (video: Video) => {
    setSelectedVideo(video);
    setIsPlaying(true);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-red-400" />
          Weekly Prediction Videos
        </h3>
        <p className="text-sm text-slate-400 mt-1">Watch our weekly breakdowns and model analysis</p>
      </div>

      {/* Featured Video */}
      {selectedVideo && isPlaying ? (
        <div className="relative aspect-video bg-black">
          <img
            src={selectedVideo.thumbnail}
            alt={selectedVideo.title}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
              <p className="text-white font-semibold">{selectedVideo.title}</p>
              <p className="text-slate-400 text-sm mt-1">Video playback coming soon</p>
              <button
                onClick={() => setIsPlaying(false)}
                className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative aspect-video cursor-pointer group"
          onClick={() => handlePlayVideo(videos[0])}
        >
          <img
            src={videos[0].thumbnail}
            alt={videos[0].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>

          {/* Video Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="inline-block bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded mb-2">
              LATEST
            </span>
            <h4 className="text-white font-bold text-lg">{videos[0].title}</h4>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {videos[0].duration}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {videos[0].views}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {videos[0].likes}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Video List */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-3">MORE VIDEOS</h4>
        <div className="space-y-3">
          {videos.slice(1).map((video) => (
            <div
              key={video.id}
              onClick={() => handlePlayVideo(video)}
              className="flex gap-3 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors group"
            >
              {/* Thumbnail */}
              <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                  {video.duration}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-white line-clamp-2 group-hover:text-cyan-400 transition-colors">
                  {video.title}
                </h5>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {video.date}
                  </span>
                  <span>{video.views} views</span>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-500 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* View All */}
      <div className="p-4 border-t border-slate-700">
        <button className="w-full py-2 text-center text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium flex items-center justify-center gap-1">
          View All Videos
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VideoSection;
