import React, { useEffect, useState, useContext } from 'react'
import { Context } from '../../context'

import { LabelGrey } from '../components'
import { BurnTable } from '../components/burnTable'
import { AllocationTable } from '../components/allocationTable'

import { Click, Colour, Center, Button } from "../components"

import '../../App.less'
import { Tabs, Modal, Row, Col } from 'antd'

const { TabPane } = Tabs

const Burn = () => {

	const context = useContext(Context)

	const [safari, setSafari] = useState(null)
	const [tab, setTab] = useState('1')
	const [loaded, setLoaded] = useState(false)
	const [modal, setModal] = useState(false)
	const [confirmLoading, setConfirmLoading] = useState(false)

	useEffect(() => {
		var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
		setSafari(isSafari)
		let pathname = window.location.pathname.split("/")[1]
		if (pathname === 'burn' && !loaded) {
			setLoaded(true)
			setTab('1')
			if(!context.connectedBSC){
				setModal(true)
			}
		}
		// eslint-disable-next-line
	}, [])

	const onChange = key => {
		setTab(key)
	}

	const showModal = () => {
		setModal(true)
	};

	const handleOk = () => {
		setConfirmLoading(true)
		context.setContext({connectedBSC:true})
		setModal(false)
	};

	const handleCancel = () => {
		setModal(false)
	};

	return (
		<>
			<Tabs defaultActiveKey='1' activeKey={tab} onChange={onChange} size={'large'} style={{ marginTop: 0, textAlign: "center" }}>
				<TabPane tab="BURN ASSETS" key="1" style={{ textAlign: "left" }}>
					<h1>CLAIM SPARTA</h1>
					<h2>Claim your share of SPARTA by burning BNB and BEP20 assets.</h2>
					<p>All assets burnt are forever destroyed. SPARTA will be minted and sent to your address.</p>
					{safari &&
						<>
							<LabelGrey>Sending Binance Smart Chain transactions requires Chrome and Metamask</LabelGrey>
							<br />
							<a href='https://metamask.io' rel="noopener noreferrer" title="Metamask Link" target="_blank" style={{ color: "#C7692B", fontSize: 12 }}>Download Metamask</a>
						</>
					}
					{!safari && context.connectedBSC &&
						<>
							<BurnTable />
						</>
					}
					{!safari && !context.connectedBSC &&
						<>
						<br/><br/><br/><br/>
						<Center><h3>It doesn't look like you are connected with Binance Smart Chain</h3></Center>
						<Center><Button onClick={showModal} type="primary">CHECK</Button></Center>
						</>
					}
				</TabPane>

				<TabPane tab="ALLOCATIONS" key="2" style={{ textAlign: "left" }}>
					<h1>ALLOCATION TABLE</h1>
					<h2>30 BINANCE CHAIN PROJECTS ARE BURNING FOR SPARTA</h2>
					{safari &&
						<>
							<LabelGrey>Sending Binance Smart Chain transactions requires Chrome and Metamask</LabelGrey>
							<a href='https://metamask.io' rel="noopener noreferrer" title="Metamask Link" target="_blank" style={{ color: "#C7692B", fontSize: 12 }}>Download Metamask</a>
						</>
					}
					{!safari &&
						<>
							<AllocationTable />
						</>
					}
				</TabPane>
			</Tabs>
			<Modal
				title={`CONNECT`}
				visible={modal}
				onOk={handleOk}
				confirmLoading={confirmLoading}
				onCancel={handleCancel}
				// footer={null}
				width={400}
			>
				<ModalContent />
			</Modal>
		</>
	)
}
export default Burn

const ModalContent = (props) => {

    return (
        <div>

            <Row>
                <Col xs={24}>
                    <p>In order to use this DApp you will need to connect with Binance Smart Chain.</p>
                    <p>You need to set your Metamask to connect to a different network.</p>
					<Click><a href='https://medium.com/@spartanprotocol/how-to-connect-metamask-to-bsc-testnet-7d89c111ab2' rel="noopener noreferrer" title="Burn Address" target="_blank" style={{ color: Colour().gold, fontSize: 12 }}>LEARN HERE -></a></Click>
					<br/><br/>
					<p>If you have connected properly, click OK.</p>
                </Col>
            </Row>
        </div>
    )
}
