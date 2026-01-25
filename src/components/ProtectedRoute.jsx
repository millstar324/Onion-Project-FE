// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ children }) => {
    // localStorage에 토큰이 있는지 확인 (로그인 여부 판단)
    const token = localStorage.getItem('token');

    if (!token) {
        // 토큰이 없으면 로그인 페이지로 강제 이동
        alert("로그인이 필요한 페이지입니다.");
        return <Navigate to="/login" replace />;
    }

    // 토큰이 있으면 원래 가려던 페이지(children)를 보여줌
    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ProtectedRoute;