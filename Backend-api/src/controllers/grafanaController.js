/**
 * @desc    Get Grafana URL from environment variables
 * @route   GET /api/grafana/url
 * @access  Public
 */
const getGrafanaUrl = (req, res) => {
    try {
        const grafanaUrl = process.env.GRAFANA_URL;
        
        if (!grafanaUrl) {
            return res.status(404).json({
                success: false,
                message: 'Grafana URL not configured',
                url: null
            });
        }

        // Ensure the URL ends with a slash
        const formattedUrl = grafanaUrl.endsWith('/') 
            ? grafanaUrl.slice(0, -1) 
            : grafanaUrl;

        res.status(200).json({
            success: true,
            url: formattedUrl
        });
    } catch (error) {
        console.error('Error getting Grafana URL:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getGrafanaUrl
};
